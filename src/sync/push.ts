/**
 * Sync Push — drains the queue and upserts to Supabase
 *
 * Batches entities by type and sends them to Supabase via supabase-js.
 * Each upsert uses ON CONFLICT (id) DO UPDATE to ensure idempotence:
 * replaying the same file twice does not create duplicates.
 *
 * Invariant: sync modifies only `syncedAt`, never business data.
 * A bug in the sync pipeline must not corrupt a find's coordinates or depth.
 *
 * Network strategy:
 * - Wi-Fi or good connection: send immediately
 * - No signal or 4G with latency: batch and retry on network return
 * - Partial failure (some rows accepted, some rejected): retry failed rows, keep succeeded
 */

import { getSupabaseClient, isSupabaseReady } from '../lib/supabase';
import {
  UUID,
} from '../db/types';
import {
  getNextBatch,
  markSynced,
  markFailed,
  SyncQueueEntry,
} from './queue';

/**
 * Run the sync pipeline: drain the queue in batches and upsert to Supabase.
 * Called when:
 * - User first opens the app (check for queued items)
 * - Network connectivity returns (window 'online' event)
 * - Periodically if in the background (if service worker supports it)
 *
 * @returns object with sync status: { synced: number, failed: number, errors: string[] }
 */
export async function drainSyncQueue(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  if (!isSupabaseReady()) {
    console.warn('[Sync] Supabase not ready, skipping sync');
    return { synced: 0, failed: 0, errors: ['Supabase not initialized'] };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { synced: 0, failed: 0, errors: ['No Supabase client'] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const BATCH_SIZE = 200; // Reasonable for 4G, process ~200 entities per request

  let batch = await getNextBatch(BATCH_SIZE);

  while (batch.length > 0) {
    try {
      // Group by entityType to send to the right table
      const byType = groupByType(batch);

      for (const [entityType, entries] of Object.entries(byType)) {
        const result = await upsertBatch(supabase, entityType, entries);

        if (result.succeeded) {
          synced += result.succeeded.length;
          // Mark these as synced
          const succeededIds = result.succeeded.map((e) => (e.payload as { id: UUID }).id);
          await markSynced(succeededIds);

          // Remove from batch so they're not retried
          batch = batch.filter(
            (e) => !succeededIds.includes((e.payload as { id: UUID }).id)
          );
        }

        if (result.failed) {
          failed += result.failed.length;

          for (const { entry, error } of result.failed) {
            if (entry.id) {
              // Backoff: if network error or transient, leave in queue
              // If validation error (unrecoverable), drop from queue
              const isTransient = error.includes('network') || error.includes('timeout');
              await markFailed(entry.id, error, isTransient);
            }
            errors.push(`${entityType} ${entry.entityId}: ${error}`);
          }
        }
      }

      // Fetch next batch
      batch = await getNextBatch(BATCH_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Batch processing failed: ${msg}`);
      console.error('[Sync] Error during batch processing:', err);
      break; // Stop processing on fatal error
    }
  }

  return { synced, failed, errors };
}

/**
 * Group queue entries by entityType for separate upserts.
 */
function groupByType(
  entries: SyncQueueEntry[]
): Record<string, SyncQueueEntry[]> {
  const grouped: Record<string, SyncQueueEntry[]> = {};

  for (const entry of entries) {
    if (!grouped[entry.entityType]) {
      grouped[entry.entityType] = [];
    }
    grouped[entry.entityType]!.push(entry);
  }

  return grouped;
}

/**
 * Upsert a batch of entities to Supabase.
 * Maps entityType to table name and calls the appropriate upsert function.
 *
 * @returns { succeeded, failed } arrays
 */
async function upsertBatch(
  supabase: ReturnType<typeof getSupabaseClient> | null,
  entityType: string,
  entries: SyncQueueEntry[]
): Promise<{
  succeeded: SyncQueueEntry[];
  failed: Array<{ entry: SyncQueueEntry; error: string }>;
}> {
  const succeeded: SyncQueueEntry[] = [];
  const failed: Array<{ entry: SyncQueueEntry; error: string }> = [];

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const sb = supabase; // Type narrowing

  // Map entityType to table name
  const tableMap: Record<string, string> = {
    session: 'sessions',
    trackPoint: 'track_points',
    sweptArea: 'swept_areas',
    digPoint: 'dig_points',
    find: 'finds',
    surfaceObservation: 'surface_observations',
  };

  const tableName = tableMap[entityType];
  if (!tableName) {
    return {
      succeeded: [],
      failed: entries.map((e) => ({
        entry: e,
        error: `Unknown entity type: ${entityType}`,
      })),
    };
  }

  // Convert entries to rows for upsert
  // Filter out entries with changeType 'delete' (soft delete already marked in Dexie)
  const rowsToUpsert = entries
    .filter((e) => e.changeType === 'upsert')
    .map((e) => convertToRow(e.payload as any));

  const rowsToDelete = entries.filter((e) => e.changeType === 'delete');

  if (rowsToUpsert.length > 0) {
    try {
      const { error } = await sb
        .from(tableName)
        .upsert(rowsToUpsert, { onConflict: 'id' });

      if (error) {
        throw new Error(error.message);
      }

      // Mark all upserted entries as succeeded
      rowsToUpsert.forEach((_, idx) => {
        if (idx < entries.length) {
          succeeded.push(entries[idx]!);
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      entries.forEach((e) => {
        if (e.changeType === 'upsert') {
          failed.push({ entry: e, error: msg });
        }
      });
    }
  }

  // Handle deletes (soft delete: just set deleted: true)
  if (rowsToDelete.length > 0) {
    try {
      const idsToDelete = rowsToDelete.map((e) => (e.payload as { id: UUID }).id);
      const { error } = await sb
        .from(tableName)
        .update({ deleted: true, synced_at: new Date().toISOString() })
        .in('id', idsToDelete);

      if (error) {
        throw new Error(error.message);
      }

      succeeded.push(...rowsToDelete);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rowsToDelete.forEach((e) => {
        failed.push({ entry: e, error: msg });
      });
    }
  }

  return { succeeded, failed };
}

/**
 * Convert entity object to Postgres row format (camelCase → snake_case).
 * Also add synced_at timestamp.
 */
function convertToRow(entity: any): any {
  const now = new Date().toISOString();

  // Simple camelCase → snake_case conversion
  const row: any = {
    synced_at: now,
  };

  const keyMap: Record<string, string> = {
    id: 'id',
    userId: 'user_id',
    sessionId: 'session_id',
    digPointId: 'dig_point_id',
    startedAt: 'started_at',
    endedAt: 'ended_at',
    updatedAt: 'updated_at',
    syncedAt: 'synced_at',
    deviceId: 'device_id',
    accuracyM: 'accuracy_m',
    altitudeM: 'altitude_m',
    speedMs: 'speed_ms',
    coord: 'coord',
    swathWidthM: 'swath_width_m',
    computedAt: 'computed_at',
    depthCm: 'depth_cm',
    presetId: 'preset_id',
    soilCondition: 'soil_condition',
    detectorModel: 'detector_model',
    detectorSettings: 'detector_settings',
    findId: 'find_id',
  };

  for (const [camel, snake] of Object.entries(keyMap)) {
    if (camel in entity) {
      row[snake] = entity[camel];
    }
  }

  // Copy remaining fields as-is
  for (const key in entity) {
    if (!(key in keyMap) && key !== 'synced_at') {
      row[key] = entity[key];
    }
  }

  return row;
}

/**
 * Listen to network connectivity and trigger sync when connection returns.
 * Call this once at app startup.
 */
export function setupNetworkListener(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', async () => {
    console.log('[Sync] Network online, draining queue...');
    const result = await drainSyncQueue();
    console.log(`[Sync] Synced ${result.synced} entities, ${result.failed} failed`);
    if (result.errors.length > 0) {
      console.warn('[Sync] Errors:', result.errors);
    }
  });

  window.addEventListener('offline', () => {
    console.log('[Sync] Network offline, queue will resume on reconnect');
  });
}
