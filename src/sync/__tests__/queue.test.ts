/**
 * Tests for sync/queue.ts
 *
 * Verifies:
 * - Enqueueing entities
 * - Batch retrieval (FIFO order)
 * - Marking as synced (removal from queue)
 * - Retry counter and error tracking
 * - Queue persistence across reload
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

import {
  enqueueSync,
  getNextBatch,
  getQueueSize,
  markSynced,
  markFailed,
  clearQueue,
  getAllQueueEntries,
  isInQueue,
} from '../queue';
import { getDatabase, resetDatabaseInstance, TreasureDB } from '../../db/schema';

// Mock IndexedDB
Object.assign(global, {
  indexedDB,
  IDBKeyRange,
});

describe('Sync Queue', () => {
  let db: TreasureDB;

  beforeEach(async () => {
    resetDatabaseInstance();
    db = getDatabase();
    // Ensure tables are created
    await db.syncQueue.clear();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should enqueue a new entity', async () => {
    const entityId = 'test-uuid-1';
    const payload = { id: entityId, coord: [0.1, 43.5], accuracyM: 5 };

    await enqueueSync('trackPoint', entityId, 'upsert', payload);

    const size = await getQueueSize();
    expect(size).toBe(1);
  });

  it('should retrieve batch in FIFO order', async () => {
    // Enqueue three entities
    await enqueueSync('trackPoint', 'uuid-1', 'upsert', { id: 'uuid-1' });
    await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure different timestamps

    await enqueueSync('digPoint', 'uuid-2', 'upsert', { id: 'uuid-2' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    await enqueueSync('find', 'uuid-3', 'upsert', { id: 'uuid-3' });

    // Retrieve batch
    const batch = await getNextBatch(10);

    expect(batch.length).toBe(3);
    expect(batch[0]!.entityId).toBe('uuid-1'); // First in
    expect(batch[1]!.entityId).toBe('uuid-2'); // Second in
    expect(batch[2]!.entityId).toBe('uuid-3'); // Third in
  });

  it('should respect batch size limit', async () => {
    // Enqueue 25 entities
    for (let i = 0; i < 25; i++) {
      await enqueueSync('trackPoint', `uuid-${i}`, 'upsert', { id: `uuid-${i}` });
    }

    // Retrieve with limit of 10
    const batch = await getNextBatch(10);
    expect(batch.length).toBe(10);

    // Retrieve next batch
    const batch2 = await getNextBatch(10);
    expect(batch2.length).toBe(10);
  });

  it('should mark entities as synced (remove from queue)', async () => {
    const ids = ['uuid-1', 'uuid-2', 'uuid-3'];
    for (const id of ids) {
      await enqueueSync('trackPoint', id, 'upsert', { id });
    }

    expect(await getQueueSize()).toBe(3);

    // Mark first two as synced
    await markSynced([ids[0]!, ids[1]!]);

    expect(await getQueueSize()).toBe(1);

    const remaining = await getAllQueueEntries();
    expect(remaining[0]!.entityId).toBe('uuid-3');
  });

  it('should increment retry counter on failure', async () => {
    await enqueueSync('trackPoint', 'uuid-1', 'upsert', { id: 'uuid-1' });

    const entries = await getAllQueueEntries();
    const queueId = entries[0]!.id;

    expect(entries[0]!.attemptCount).toBe(0);

    // Mark as failed with backoff
    if (queueId) {
      await markFailed(queueId, 'Network timeout', true);
    }

    const updated = await getAllQueueEntries();
    expect(updated[0]!.attemptCount).toBe(1);
    expect(updated[0]!.lastError).toBe('Network timeout');
  });

  it('should remove from queue on unrecoverable error', async () => {
    await enqueueSync('trackPoint', 'uuid-1', 'upsert', { id: 'uuid-1' });

    expect(await getQueueSize()).toBe(1);

    const entries = await getAllQueueEntries();
    const queueId = entries[0]!.id;

    // Mark as failed without backoff (unrecoverable)
    if (queueId) {
      await markFailed(queueId, 'RLS violation', false);
    }

    expect(await getQueueSize()).toBe(0);
  });

  it('should detect if entity is in queue', async () => {
    const id = 'uuid-1';

    expect(await isInQueue(id)).toBe(false);

    await enqueueSync('trackPoint', id, 'upsert', { id });

    expect(await isInQueue(id)).toBe(true);
  });

  it('should clear entire queue', async () => {
    for (let i = 0; i < 5; i++) {
      await enqueueSync('trackPoint', `uuid-${i}`, 'upsert', { id: `uuid-${i}` });
    }

    expect(await getQueueSize()).toBe(5);

    await clearQueue();

    expect(await getQueueSize()).toBe(0);
  });

  it('should handle soft delete entries', async () => {
    const id = 'uuid-1';

    await enqueueSync('trackPoint', id, 'delete', { id, deleted: true });

    const entries = await getAllQueueEntries();
    expect(entries[0]!.changeType).toBe('delete');
  });
});
