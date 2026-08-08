/**
 * Sync Queue — persisted in IndexedDB, survives browser reload
 *
 * Manages a queue of entities awaiting sync to Supabase.
 * Each entity in the queue has:
 * - entityType (session, trackPoint, digPoint, find, surfaceObservation, etc.)
 * - entityId (UUID, client-generated)
 * - changeType (upsert or delete)
 * - payload (the full entity as JSON)
 * - createdAt (when added to queue)
 * - attemptCount (retry counter)
 * - lastError (last error message if sync failed)
 *
 * The queue lives in the `syncQueue` table of Dexie.
 * No manual intervention needed — the sync pipeline drains it asynchronously.
 */

import { getDatabase } from '../db/schema';
import { UUID } from '../db/types';

export interface SyncQueueEntry {
  id?: number; // internal Dexie ID
  entityType: string;
  entityId: UUID;
  changeType: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string; // ISO date
  attemptCount: number;
  lastError?: string;
}

/**
 * Enqueue an entity for sync to Supabase.
 * This is called immediately after any local change (create, update, delete).
 *
 * @param entityType e.g. 'session', 'trackPoint', 'digPoint', 'find'
 * @param entityId UUID of the entity
 * @param changeType 'upsert' for create/update, 'delete' for soft delete
 * @param payload the full entity object
 */
export async function enqueueSync(
  entityType: string,
  entityId: UUID,
  changeType: 'upsert' | 'delete',
  payload: unknown
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const entry: SyncQueueEntry = {
    entityType,
    entityId,
    changeType,
    payload,
    createdAt: now,
    attemptCount: 0,
    lastError: undefined,
  };

  await db.syncQueue.add(entry);
}

/**
 * Get the next batch of entries from the queue, ordered by createdAt (FIFO).
 * Entries are NOT removed; they stay in the queue until markSynced() is called.
 *
 * @param batchSize default 200 (reasonable batch for a 4G connection)
 * @returns array of sync queue entries, oldest first
 */
export async function getNextBatch(batchSize: number = 200): Promise<SyncQueueEntry[]> {
  const db = getDatabase();

  const entries = await db.syncQueue
    .orderBy('createdAt')
    .limit(batchSize)
    .toArray();

  return entries;
}

/**
 * Get the total count of unsync'd entries in the queue.
 * Used for the sync status badge.
 */
export async function getQueueSize(): Promise<number> {
  const db = getDatabase();
  return await db.syncQueue.count();
}

/**
 * Mark entries as successfully synced by removing them from the queue.
 * Called by the sync pipeline after a successful Supabase upsert.
 *
 * @param entityIds array of entity IDs that were successfully synced
 */
export async function markSynced(entityIds: UUID[]): Promise<void> {
  const db = getDatabase();

  // Find entries in the queue that match these entity IDs
  const entries = await db.syncQueue.where('entityId').anyOf(entityIds).toArray();

  // Delete them
  for (const entry of entries) {
    if (entry.id) {
      await db.syncQueue.delete(entry.id);
    }
  }
}

/**
 * Mark an entry as failed and increment the retry counter.
 * Used by the sync pipeline if a request fails (network error, validation error, etc.).
 *
 * @param queueEntryId internal Dexie ID of the queue entry
 * @param error error message
 * @param shouldBackoff if true, leave in queue; if false, remove from queue (unrecoverable error)
 */
export async function markFailed(
  queueEntryId: number,
  error: string,
  shouldBackoff: boolean = true
): Promise<void> {
  const db = getDatabase();

  const entry = await db.syncQueue.get(queueEntryId);
  if (!entry) {
    return;
  }

  if (shouldBackoff) {
    // Increment retry counter and update error message
    entry.attemptCount += 1;
    entry.lastError = error;
    await db.syncQueue.put(entry);
  } else {
    // Unrecoverable error (e.g., RLS violation, schema validation). Drop from queue.
    // In production, you might log this to a separate error table for manual review.
    await db.syncQueue.delete(queueEntryId);
  }
}

/**
 * Clear the entire sync queue (used only in testing or for manual reset).
 * DANGEROUS — use with care.
 */
export async function clearQueue(): Promise<void> {
  const db = getDatabase();
  await db.syncQueue.clear();
}

/**
 * Get all entries in the queue (for debugging or export).
 */
export async function getAllQueueEntries(): Promise<SyncQueueEntry[]> {
  const db = getDatabase();
  return await db.syncQueue.orderBy('createdAt').toArray();
}

/**
 * Check if an entity is already in the queue (to avoid duplicate entries).
 */
export async function isInQueue(entityId: UUID): Promise<boolean> {
  const db = getDatabase();
  const entry = await db.syncQueue.where('entityId').equals(entityId).first();
  return !!entry;
}
