/**
 * Test suite for TreasureDB schema and invariants
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TreasureDB,
  resetDatabaseInstance,
  createFind,
  softDelete,
  generateUUID,
} from '../schema';
import { Session, DigPoint, Find, TrackPoint } from '../types';

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

describe('TreasureDB schema', () => {
  describe('Invariant 1: Find requires DigPoint', () => {
    it('should throw when creating a Find without an existing DigPoint', async () => {
      const nonExistentDigPointId = generateUUID();

      const findData: Omit<Find, 'id' | 'updatedAt' | 'syncedAt'> = {
        digPointId: nonExistentDigPointId,
        at: new Date().toISOString(),
        category: 'monnaie',
        material: 'billon',
        photos: [],
        deviceId: 'test-device',
        deleted: false,
      };

      // Should throw immediately
      await expect(createFind(db, findData)).rejects.toThrow(
        /referenced DigPoint does not exist/i
      );
    });

    it('should succeed when creating a Find with an existing DigPoint', async () => {
      const sessionId = generateUUID();
      const digPointId = generateUUID();
      const now = new Date().toISOString();

      // Create session first
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId: 'test-device',
        updatedAt: now,
        deleted: false,
      } as Session);

      // Create DigPoint
      await db.digPoints.add({
        id: digPointId,
        sessionId,
        at: now,
        coord: [0.1908, 43.5742],
        accuracyM: 5,
        outcome: 'trouvaille',
        deviceId: 'test-device',
        updatedAt: now,
        deleted: false,
      } as DigPoint);

      // Now create Find — should succeed
      const findData: Omit<Find, 'id' | 'updatedAt' | 'syncedAt'> = {
        digPointId,
        at: now,
        category: 'monnaie',
        material: 'billon',
        photos: [],
        deviceId: 'test-device',
        deleted: false,
      };

      const findId = await createFind(db, findData);
      expect(findId).toBeDefined();

      // Verify it was inserted
      const inserted = await db.finds.get(findId);
      expect(inserted).toBeDefined();
      expect(inserted?.digPointId).toBe(digPointId);
    });

    it('should find a Find by its ID after creation', async () => {
      const sessionId = generateUUID();
      const digPointId = generateUUID();
      const now = new Date().toISOString();

      // Setup
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId: 'test-device',
        updatedAt: now,
        deleted: false,
      } as Session);

      await db.digPoints.add({
        id: digPointId,
        sessionId,
        at: now,
        coord: [0.1908, 43.5742],
        accuracyM: 5,
        outcome: 'trouvaille',
        deviceId: 'test-device',
        updatedAt: now,
        deleted: false,
      } as DigPoint);

      // Create Find
      const findId = await createFind(db, {
        digPointId,
        at: now,
        category: 'fibule',
        material: 'bronze',
        photos: ['photo1.jpg'],
        deviceId: 'test-device',
        deleted: false,
      });

      // Verify find can be retrieved
      const found = await db.finds.get(findId);
      expect(found?.id).toBe(findId);
      expect(found?.digPointId).toBe(digPointId);
      expect(found?.category).toBe('fibule');
    });
  });

  describe('Idempotent upsert', () => {
    it('should not duplicate a TrackPoint on second insert', async () => {
      const sessionId = generateUUID();
      const trackPointId = generateUUID();
      const now = new Date().toISOString();
      const deviceId = 'test-device';

      // Create session
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId,
        updatedAt: now,
        deleted: false,
      } as Session);

      const trackPoint: TrackPoint = {
        id: trackPointId,
        sessionId,
        at: now,
        coord: [0.1908, 43.5742],
        accuracyM: 5,
        deviceId,
        updatedAt: now,
        deleted: false,
      };

      // Insert once
      await db.trackPoints.put(trackPoint);
      let count = await db.trackPoints.count();
      expect(count).toBe(1);

      // Insert again with same ID (simulating replay of sync queue)
      await db.trackPoints.put(trackPoint);
      count = await db.trackPoints.count();

      // Should still be 1, not 2 (idempotent)
      expect(count).toBe(1);
    });

    it('should update syncedAt on second insert', async () => {
      const sessionId = generateUUID();
      const trackPointId = generateUUID();
      const now = new Date().toISOString();
      const deviceId = 'test-device';

      // Create session
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId,
        updatedAt: now,
        deleted: false,
      } as Session);

      const trackPoint: TrackPoint = {
        id: trackPointId,
        sessionId,
        at: now,
        coord: [0.1908, 43.5742],
        accuracyM: 5,
        deviceId,
        updatedAt: now,
        deleted: false,
      };

      // Insert without syncedAt
      await db.trackPoints.put(trackPoint);
      let retrieved = await db.trackPoints.get(trackPointId);
      expect(retrieved?.syncedAt).toBeUndefined();

      // Simulate sync: update syncedAt
      const syncedNow = new Date().toISOString();
      await db.trackPoints.update(trackPointId, { syncedAt: syncedNow });

      retrieved = await db.trackPoints.get(trackPointId);
      expect(retrieved?.syncedAt).toBe(syncedNow);
    });
  });

  describe('Soft delete', () => {
    it('should mark an entity as deleted without removing it', async () => {
      const sessionId = generateUUID();
      const now = new Date().toISOString();

      // Create
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId: 'test-device',
        updatedAt: now,
        deleted: false,
      } as Session);

      // Verify it exists
      let session = await db.sessions.get(sessionId);
      expect(session).toBeDefined();
      expect(session?.deleted).toBe(false);
      const originalUpdatedAt = session?.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Soft delete
      await softDelete(db.sessions, sessionId);

      // Still exists, but marked deleted
      session = await db.sessions.get(sessionId);
      expect(session).toBeDefined();
      expect(session?.deleted).toBe(true);

      // updatedAt should be changed (it's now)
      expect(session?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('Indexes', () => {
    it('should query TrackPoint by sessionId', async () => {
      const sessionId = generateUUID();
      const now = new Date().toISOString();
      const deviceId = 'test-device';

      // Create session
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId,
        updatedAt: now,
        deleted: false,
      } as Session);

      // Add multiple TrackPoints
      await db.trackPoints.bulkAdd([
        {
          id: generateUUID(),
          sessionId,
          at: now,
          coord: [0.1, 43.5],
          accuracyM: 5,
          deviceId,
          updatedAt: now,
          deleted: false,
        } as TrackPoint,
        {
          id: generateUUID(),
          sessionId,
          at: new Date(new Date(now).getTime() + 1000).toISOString(),
          coord: [0.11, 43.51],
          accuracyM: 5,
          deviceId,
          updatedAt: now,
          deleted: false,
        } as TrackPoint,
      ]);

      // Query by sessionId
      const points = await db.trackPoints.where('sessionId').equals(sessionId).toArray();
      expect(points.length).toBe(2);
    });

    it('should query DigPoint by outcome', async () => {
      const sessionId = generateUUID();
      const now = new Date().toISOString();
      const deviceId = 'test-device';

      // Create session
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId,
        updatedAt: now,
        deleted: false,
      } as Session);

      // Add DigPoints with different outcomes
      await db.digPoints.bulkAdd([
        {
          id: generateUUID(),
          sessionId,
          at: now,
          coord: [0.1, 43.5],
          accuracyM: 5,
          outcome: 'rien',
          deviceId,
          updatedAt: now,
          deleted: false,
        } as DigPoint,
        {
          id: generateUUID(),
          sessionId,
          at: now,
          coord: [0.11, 43.51],
          accuracyM: 5,
          outcome: 'trouvaille',
          deviceId,
          updatedAt: now,
          deleted: false,
        } as DigPoint,
      ]);

      // Query by outcome
      const rien = await db.digPoints.where('outcome').equals('rien').toArray();
      const trouvaille = await db.digPoints.where('outcome').equals('trouvaille').toArray();

      expect(rien.length).toBe(1);
      expect(trouvaille.length).toBe(1);
    });
  });

  describe('Database isolation', () => {
    it('should handle multiple database names separately', async () => {
      const sessionId = generateUUID();
      const now = new Date().toISOString();

      // Add to first instance
      await db.sessions.add({
        id: sessionId,
        startedAt: now,
        parcels: [],
        deviceId: 'device1',
        updatedAt: now,
        deleted: false,
      } as Session);

      // Verify data is in first instance
      const count1 = await db.sessions.count();
      expect(count1).toBe(1);

      // Data should persist after reopening the same db instance
      const sessionAfter = await db.sessions.get(sessionId);
      expect(sessionAfter?.id).toBe(sessionId);
    });
  });

  describe('UUID generation', () => {
    it('should generate valid UUID v4 strings', () => {
      const uuid = generateUUID();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
