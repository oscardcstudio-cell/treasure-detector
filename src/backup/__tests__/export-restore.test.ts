/**
 * Tests for backup export and restore functionality.
 * Round-trip test: export → clear base → restore = identical
 */

import { it, expect, beforeEach, afterEach } from 'vitest';
import { TreasureDB, generateUUID } from '../../db/schema';
import { exportDatabase } from '../export';
import { importBackup, isDatabaseEmpty } from '../restore';
import type { Session, DigPoint, Find, TrackPoint } from '../../db/types';

let db: TreasureDB;

beforeEach(async () => {
  // Create a fresh test database
  db = new TreasureDB();
  // Note: TreasureDB uses name 'TreasureDetector' by default.
  // For testing, you might want to use a different name or mock.
});

afterEach(async () => {
  await db.delete();
});

/**
 * Test: Round-trip export and import
 * Export a populated database, then import it into a fresh one.
 * Data should be identical.
 */
it('should round-trip: export → clear → import = identical', async () => {
  const deviceId = 'test-device-001';
  const sessionId = generateUUID();
  const digPointId = generateUUID();
  const findId = generateUUID();

  // Populate the database
  const session: Session = {
    id: sessionId,
    startedAt: '2026-08-08T10:00:00Z',
    endedAt: '2026-08-08T14:00:00Z',
    label: 'Test session',
    parcels: ['32009_A_0123'],
    weather: 'cloudy',
    soilCondition: 'labour_frais',
    deviceId,
    updatedAt: '2026-08-08T14:00:00Z',
  };

  const trackPoint: TrackPoint = {
    id: generateUUID(),
    sessionId,
    at: '2026-08-08T10:05:00Z',
    coord: [0.1908, 43.5742],
    accuracyM: 5,
    deviceId,
    updatedAt: '2026-08-08T10:05:00Z',
  };

  const digPoint: DigPoint = {
    id: digPointId,
    sessionId,
    at: '2026-08-08T10:30:00Z',
    coord: [0.1910, 43.5745],
    accuracyM: 4,
    depthCm: 15,
    outcome: 'trouvaille',
    findId,
    deviceId,
    updatedAt: '2026-08-08T10:30:00Z',
  };

  const find: Find = {
    id: findId,
    digPointId,
    at: '2026-08-08T10:30:00Z',
    category: 'monnaie',
    material: 'billon',
    period: 'medieval',
    depthCm: 15,
    photos: [],
    description: 'Denier blanchi',
    deviceId,
    updatedAt: '2026-08-08T10:30:00Z',
  };

  // Insert into database
  await db.sessions.add(session);
  await db.trackPoints.add(trackPoint);
  await db.digPoints.add(digPoint);
  await db.finds.add(find);

  // Export
  const exportedJson = await exportDatabase(db);
  const exported = JSON.parse(exportedJson);

  // Verify export contains correct data
  expect(exported.sessions).toHaveLength(1);
  expect(exported.sessions[0].id).toBe(sessionId);
  expect(exported.trackPoints).toHaveLength(1);
  expect(exported.digPoints).toHaveLength(1);
  expect(exported.finds).toHaveLength(1);

  // Clear the database (simulate iOS purge)
  await db.sessions.clear();
  await db.trackPoints.clear();
  await db.digPoints.clear();
  await db.finds.clear();

  // Verify database is empty
  expect(await isDatabaseEmpty(db)).toBe(true);

  // Import the backup
  const importResult = await importBackup(exportedJson, db);
  expect(importResult.success).toBe(true);
  expect(importResult.imported).toBeGreaterThan(0);

  // Verify restored data
  const restoredSession = await db.sessions.get(sessionId);
  expect(restoredSession).toBeDefined();
  expect(restoredSession?.label).toBe('Test session');

  const restoredDigPoint = await db.digPoints.get(digPointId);
  expect(restoredDigPoint).toBeDefined();
  expect(restoredDigPoint?.outcome).toBe('trouvaille');

  const restoredFind = await db.finds.get(findId);
  expect(restoredFind).toBeDefined();
  expect(restoredFind?.category).toBe('monnaie');
});

/**
 * Test: Idempotent import
 * Re-importing the same backup twice should not create duplicates.
 */
it('should be idempotent: re-import does not duplicate', async () => {
  const deviceId = 'test-device-002';
  const sessionId = generateUUID();
  const digPointId = generateUUID();

  const session: Session = {
    id: sessionId,
    startedAt: '2026-08-08T10:00:00Z',
    parcels: [],
    deviceId,
    updatedAt: '2026-08-08T10:00:00Z',
  };

  const digPoint: DigPoint = {
    id: digPointId,
    sessionId,
    at: '2026-08-08T10:30:00Z',
    coord: [0.1910, 43.5745],
    accuracyM: 4,
    outcome: 'rien',
    deviceId,
    updatedAt: '2026-08-08T10:30:00Z',
  };

  await db.sessions.add(session);
  await db.digPoints.add(digPoint);

  const exportedJson = await exportDatabase(db);

  // Clear and import once
  await db.sessions.clear();
  await db.digPoints.clear();

  const import1 = await importBackup(exportedJson, db);
  expect(import1.success).toBe(true);

  const countAfter1 = await db.digPoints.count();
  expect(countAfter1).toBe(1);

  // Import the same backup again
  const import2 = await importBackup(exportedJson, db);
  expect(import2.success).toBe(true);

  const countAfter2 = await db.digPoints.count();
  // Should still be 1, not 2 (idempotent due to UUID-based upsert)
  expect(countAfter2).toBe(1);
});

/**
 * Test: Empty database detection
 */
it('should correctly detect empty database', async () => {
  expect(await isDatabaseEmpty(db)).toBe(true);

  // Add one session
  await db.sessions.add({
    id: generateUUID(),
    startedAt: '2026-08-08T10:00:00Z',
    parcels: [],
    deviceId: 'test',
    updatedAt: '2026-08-08T10:00:00Z',
  });

  expect(await isDatabaseEmpty(db)).toBe(false);
});

/**
 * Test: Export format validation
 */
it('should export valid schema version', async () => {
  const exported = await exportDatabase(db);
  const payload = JSON.parse(exported);

  expect(payload.version).toBe('1.0');
  expect(payload.schemaVersion).toBe(1);
  expect(payload.exportedAt).toBeDefined();
  expect(typeof payload.exportedAt).toBe('string');
  expect(Array.isArray(payload.sessions)).toBe(true);
  expect(Array.isArray(payload.trackPoints)).toBe(true);
  expect(Array.isArray(payload.digPoints)).toBe(true);
  expect(Array.isArray(payload.finds)).toBe(true);
});

/**
 * Test: Negative outcomes are preserved
 * DigPoints with outcome: 'rien' are valuable and should be exported/imported.
 */
it('should preserve negative outcomes (rien)', async () => {
  const sessionId = generateUUID();
  const digPointId = generateUUID();

  const digPoint: DigPoint = {
    id: digPointId,
    sessionId,
    at: '2026-08-08T10:30:00Z',
    coord: [0.1910, 43.5745],
    accuracyM: 4,
    outcome: 'rien',
    deviceId: 'test',
    updatedAt: '2026-08-08T10:30:00Z',
  };

  await db.digPoints.add(digPoint);

  const exported = await exportDatabase(db);
  const payload = JSON.parse(exported);

  expect(payload.digPoints).toHaveLength(1);
  expect(payload.digPoints[0].outcome).toBe('rien');
});
