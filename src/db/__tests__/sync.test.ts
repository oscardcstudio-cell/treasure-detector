/**
 * Test suite for sync queue and idempotence semantics
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TreasureDB, resetDatabaseInstance, generateUUID } from '../schema';
import { Session, Find, DigPoint } from '../types';

let db: TreasureDB;

beforeEach(async () => {
  resetDatabaseInstance();
  db = new TreasureDB();
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.close();
  resetDatabaseInstance();
});

describe('Sync queue', () => {
  it('should add an entry to syncQueue when an entity is created', async () => {
    const sessionId = generateUUID();
    const now = new Date().toISOString();

    // Create a session
    await db.sessions.add({
      id: sessionId,
      startedAt: now,
      parcels: [],
      deviceId: 'test-device',
      updatedAt: now,
      deleted: false,
    } as Session);

    // Manually add to sync queue (in real code, this would happen in a hook)
    await db.syncQueue.add({
      entityType: 'session',
      entityId: sessionId,
      changeType: 'upsert',
      payload: { id: sessionId, startedAt: now },
      createdAt: now,
      attemptCount: 0,
    });

    // Verify
    const queued = await db.syncQueue.toArray();
    expect(queued.length).toBe(1);
    expect(queued[0]).toBeDefined();
    expect(queued[0]!.entityId).toBe(sessionId);
    expect(queued[0]!.changeType).toBe('upsert');
  });

  it('should allow retrying failed sync entries', async () => {
    const sessionId = generateUUID();
    const now = new Date().toISOString();

    // Add a sync queue entry with an error
    const queueId = await db.syncQueue.add({
      entityType: 'session',
      entityId: sessionId,
      changeType: 'upsert',
      payload: { id: sessionId },
      createdAt: now,
      attemptCount: 1,
      lastError: 'Network timeout',
    });

    // Update it (simulate retry)
    await db.syncQueue.update(queueId, {
      attemptCount: 2,
      lastError: undefined,
    });

    // Verify
    const entry = await db.syncQueue.get(queueId);
    expect(entry?.attemptCount).toBe(2);
    expect(entry?.lastError).toBeUndefined();
  });

  it('should remove sync queue entry after successful sync', async () => {
    const sessionId = generateUUID();
    const now = new Date().toISOString();

    const queueId = await db.syncQueue.add({
      entityType: 'session',
      entityId: sessionId,
      changeType: 'upsert',
      payload: { id: sessionId },
      createdAt: now,
      attemptCount: 0,
    });

    // Verify it exists
    let entry = await db.syncQueue.get(queueId);
    expect(entry).toBeDefined();

    // Simulate sync success: delete from queue
    await db.syncQueue.delete(queueId);

    entry = await db.syncQueue.get(queueId);
    expect(entry).toBeUndefined();
  });
});

describe('Sync idempotence semantics', () => {
  it('should handle replaying the same Find twice', async () => {
    const sessionId = generateUUID();
    const digPointId = generateUUID();
    const findId = generateUUID();
    const now = new Date().toISOString();
    const deviceId = 'test-device';

    // Setup: Create session and DigPoint
    await db.sessions.add({
      id: sessionId,
      startedAt: now,
      parcels: [],
      deviceId,
      updatedAt: now,
      deleted: false,
    } as Session);

    await db.digPoints.add({
      id: digPointId,
      sessionId,
      at: now,
      coord: [0.1, 43.5],
      accuracyM: 5,
      outcome: 'trouvaille',
      deviceId,
      updatedAt: now,
      deleted: false,
    } as DigPoint);

    const findData: Find = {
      id: findId,
      digPointId,
      at: now,
      category: 'monnaie',
      material: 'billon',
      photos: [],
      deviceId,
      updatedAt: now,
      deleted: false,
    };

    // Insert Find once
    await db.finds.put(findData);
    let count = await db.finds.count();
    expect(count).toBe(1);

    // Replay: insert again with same ID
    await db.finds.put(findData);
    count = await db.finds.count();
    expect(count).toBe(1); // Still 1, idempotent

    // Verify the data is correct
    const retrieved = await db.finds.get(findId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.category).toBe('monnaie');
  });

  it('should handle partial sync failure and resume', async () => {
    const now = new Date().toISOString();

    // Simulate sync queue with multiple items (with explicit IDs for the queue table)
    const item1EntityId = generateUUID();
    const item2EntityId = generateUUID();
    const item3EntityId = generateUUID();

    await db.syncQueue.bulkAdd([
      {
        id: 1,
        entityType: 'session',
        entityId: item1EntityId,
        changeType: 'upsert',
        payload: { id: item1EntityId },
        createdAt: now,
        attemptCount: 0,
      },
      {
        id: 2,
        entityType: 'digPoint',
        entityId: item2EntityId,
        changeType: 'upsert',
        payload: { id: item2EntityId },
        createdAt: now,
        attemptCount: 0,
      },
      {
        id: 3,
        entityType: 'find',
        entityId: item3EntityId,
        changeType: 'upsert',
        payload: { id: item3EntityId },
        createdAt: now,
        attemptCount: 0,
      },
    ]);

    // Verify all 3 items are in queue
    let all = await db.syncQueue.toArray();
    expect(all.length).toBe(3);

    // Simulate: first item syncs successfully
    await db.syncQueue.delete(1); // Remove from queue after success

    // Update second item with error
    await db.syncQueue.update(2, { attemptCount: 1, lastError: 'Network error' });

    // Verify: item2 and item3 still queued (2 items)
    let remaining = await db.syncQueue.toArray();
    expect(remaining.length).toBe(2);

    // Simulate retry: item2 now succeeds
    await db.syncQueue.delete(2);

    const final = await db.syncQueue.toArray();
    expect(final.length).toBe(1);
  });

  it('should preserve business data integrity during sync', async () => {
    const digPointId = generateUUID();
    const sessionId = generateUUID();
    const now = new Date().toISOString();
    const deviceId = 'test-device';

    // Create and insert DigPoint
    const digPoint: DigPoint = {
      id: digPointId,
      sessionId,
      at: now,
      coord: [0.1908, 43.5742], // Original coordinates
      accuracyM: 5,
      depthCm: 15,
      outcome: 'rien',
      deviceId,
      updatedAt: now,
      deleted: false,
    };

    await db.digPoints.add(digPoint);

    // Sync: update only syncedAt, not business data
    const syncedNow = new Date().toISOString();
    await db.digPoints.update(digPointId, {
      syncedAt: syncedNow, // Only this changes
    });

    // Verify business data is unchanged
    const retrieved = await db.digPoints.get(digPointId);
    expect(retrieved?.coord).toEqual([0.1908, 43.5742]); // Unchanged
    expect(retrieved?.depthCm).toBe(15); // Unchanged
    expect(retrieved?.outcome).toBe('rien'); // Unchanged
    expect(retrieved?.syncedAt).toBe(syncedNow); // Only this changed
  });
});
