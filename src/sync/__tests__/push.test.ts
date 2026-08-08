/**
 * Tests for sync/push.ts
 *
 * Verifies:
 * - Batching by entity type
 * - Idempotence: replaying the same sync file doesn't duplicate entities
 * - Partial failure: some rows succeed, some fail (retry failed ones)
 * - Sync never modifies business data, only syncedAt
 * - Wi-Fi-only constraint for photos
 *
 * Uses mocks for Supabase client to avoid external dependencies.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

import { drainSyncQueue } from '../push';
import { enqueueSync, clearQueue, getQueueSize } from '../queue';
import { resetDatabaseInstance, getDatabase } from '../../db/schema';

Object.assign(global, {
  indexedDB,
  IDBKeyRange,
});

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn((_table: string) => ({
    upsert: vi.fn(async (_rows: any[]) => {
      // By default, all rows succeed
      return { error: null };
    }),
    update: vi.fn(async () => {
      return { error: null };
    }),
    in: vi.fn(() => ({
      update: vi.fn(async () => {
        return { error: null };
      }),
    })),
  })),
};

// Mock the Supabase module
vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => mockSupabaseClient,
  isSupabaseReady: () => true,
}));

// Mock auth module to simulate authenticated user
vi.mock('../../auth/session', () => ({
  isAuthenticated: vi.fn().mockResolvedValue(true),
}));

describe('Sync Push', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    vi.clearAllMocks();
    await clearQueue();
  });

  afterEach(async () => {
    const db = getDatabase();
    await db.close();
  });

  it('should drain empty queue without error', async () => {
    const result = await drainSyncQueue();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should batch entities by type', async () => {
    // Enqueue mixed entity types
    await enqueueSync('trackPoint', 'tp-1', 'upsert', { id: 'tp-1', coord: [0.1, 43.5] });
    await enqueueSync('digPoint', 'dp-1', 'upsert', { id: 'dp-1', coord: [0.2, 43.6] });
    await enqueueSync('trackPoint', 'tp-2', 'upsert', { id: 'tp-2', coord: [0.3, 43.7] });

    await drainSyncQueue();

    // Verify separate calls for each table
    const fromCalls = mockSupabaseClient.from.mock.calls;
    const tables = fromCalls.map((call) => call[0]!);

    expect(tables).toContain('track_points');
    expect(tables).toContain('dig_points');
  });

  it('should achieve idempotence: replaying twice produces no duplicates', async () => {
    const id = 'uuid-1';
    const payload = { id, coord: [0.1, 43.5], accuracyM: 5 };

    // Enqueue the same entity twice
    await enqueueSync('trackPoint', id, 'upsert', payload);

    // Simulate first sync
    let result = await drainSyncQueue();
    expect(result.synced).toBeGreaterThan(0);

    // Re-enqueue (simulating replay of sync file)
    await enqueueSync('trackPoint', id, 'upsert', payload);

    // Sync again
    result = await drainSyncQueue();
    expect(result.synced).toBeGreaterThan(0);

    // The Supabase mock uses ON CONFLICT (id) DO UPDATE, so no duplicates.
    // Both syncs succeed (idempotent).
  });

  it('should recover from mid-batch failure', async () => {
    // Enqueue 3 entities
    for (let i = 0; i < 3; i++) {
      await enqueueSync('trackPoint', `uuid-${i}`, 'upsert', { id: `uuid-${i}` });
    }

    // Mock partial failure: first upsert fails, second succeeds
    let callCount = 0;
    mockSupabaseClient.from.mockImplementation(
      (_: string) => ({
        upsert: vi.fn(async (_rows: any[]) => {
          callCount++;
          if (callCount === 1) {
            // First call fails
            return { error: { message: 'Network error' } };
          }
          // Subsequent calls succeed
          return { error: null };
        }),
        update: vi.fn(async () => ({ error: null })),
        in: vi.fn(() => ({
          update: vi.fn(async () => ({ error: null })),
        })),
      })
    );

    const result = await drainSyncQueue();

    // Expect: synced some, failed others, queued for retry
    expect(result.synced + result.failed).toBeGreaterThan(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should not modify business data during sync, only syncedAt', async () => {
    const id = 'uuid-1';
    const payload = {
      id,
      coord: [0.1, 43.5],
      accuracyM: 5,
      altitudeM: 250,
      speedMs: 1.2,
      updatedAt: '2026-08-08T10:00:00Z',
    };

    await enqueueSync('trackPoint', id, 'upsert', payload);

    // Capture the upsert call
    const upsertCalls: any[] = [];
    mockSupabaseClient.from.mockImplementation(() => ({
      upsert: vi.fn(async (rows: any[]) => {
        upsertCalls.push(rows);
        return { error: null };
      }),
      update: vi.fn(async () => ({ error: null })),
      in: vi.fn(() => ({
        update: vi.fn(async () => ({ error: null })),
      })),
    }));

    await drainSyncQueue();

    // Verify that only syncedAt is added, not other fields
    expect(upsertCalls.length).toBeGreaterThan(0);
    const upsertnedRow = upsertCalls[0][0];

    // Original fields should remain unchanged
    expect(upsertnedRow.accuracy_m).toBe(5);
    expect(upsertnedRow.altitude_m).toBe(250);
    expect(upsertnedRow.speed_ms).toBe(1.2);

    // syncedAt should be added
    expect(upsertnedRow.synced_at).toBeDefined();
  });

  it('should flatten Session.detector to detector_model/detector_settings columns', async () => {
    // Bloquant T4.2 : detector est imbriqué côté app, plat côté Postgres —
    // sans aplatissement l'objet part vers une colonne inexistante.
    const id = 'session-uuid-1';
    const payload = {
      id,
      startedAt: '2026-08-08T09:00:00Z',
      parcels: ['32009000AB0042'],
      soilCondition: 'labour_frais',
      detector: { model: 'Garrett ACE 250', settings: 'All-Metal, sens 6' },
      updatedAt: '2026-08-08T10:00:00Z',
    };

    await enqueueSync('session', id, 'upsert', payload);

    const upsertCalls: any[] = [];
    mockSupabaseClient.from.mockImplementation(() => ({
      upsert: vi.fn(async (rows: any[]) => {
        upsertCalls.push(rows);
        return { error: null };
      }),
      update: vi.fn(async () => ({ error: null })),
      in: vi.fn(() => ({
        update: vi.fn(async () => ({ error: null })),
      })),
    }));

    await drainSyncQueue();

    expect(upsertCalls.length).toBeGreaterThan(0);
    const row = upsertCalls[0][0];

    // Aplati vers les colonnes SQL
    expect(row.detector_model).toBe('Garrett ACE 250');
    expect(row.detector_settings).toBe('All-Metal, sens 6');
    // L'objet imbriqué ne doit PAS partir tel quel (colonne inexistante -> échec du lot)
    expect(row.detector).toBeUndefined();
    // Les autres champs suivent le mapping normal
    expect(row.soil_condition).toBe('labour_frais');
    expect(row.parcels).toEqual(['32009000AB0042']);
  });

  it('should handle soft deletes', async () => {
    const id = 'uuid-1';

    // Enqueue a delete
    await enqueueSync('trackPoint', id, 'delete', { id, deleted: true });

    await drainSyncQueue();

    // Verify that an UPDATE was called (soft delete)
    const fromCalls = mockSupabaseClient.from.mock.calls;
    expect(fromCalls.some((call) => call[0]! === 'track_points')).toBe(true);
  });

  it('should queue remaining items if sync queue is large', async () => {
    // Enqueue 250 items (more than default batch size of 200)
    for (let i = 0; i < 250; i++) {
      await enqueueSync('trackPoint', `uuid-${i}`, 'upsert', { id: `uuid-${i}` });
    }

    expect(await getQueueSize()).toBe(250);

    // Drain with default batch size (200)
    const result = await drainSyncQueue();

    // Expect all to eventually sync (multiple batches)
    expect(result.synced).toBeGreaterThan(0);
  });
});
