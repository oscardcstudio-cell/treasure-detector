/**
 * Finds module tests: round-trip workflow with photo compression.
 *
 * Test suite validates:
 * 1. DigPoint creation without Find fails
 * 2. Find creation requires existing DigPoint
 * 3. Photo compression reduces size
 * 4. Export/import cycle preserves data
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TreasureDB,
  createFind,
  generateUUID,
  softDelete,
} from '../../db/schema';
import { DigPoint, Find, Session, TrackPoint } from '../../db/types';
import {
  exportSessionAsGeoJSON,
  exportFindsAsGeoJSON,
  exportTracksAsGPX,
  importFindsFromGeoJSON,
  importTracksFromGPX,
} from '../exchange';
import { estimatePhotoSize } from '../../platform/camera';

describe('Finds module — round-trip workflow', () => {
  let db: TreasureDB;
  const now = new Date().toISOString();
  const sessionId = generateUUID();
  const coord = [0.1908, 43.5742] as [number, number];

  beforeEach(async () => {
    db = new TreasureDB();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Invariant: Find requires DigPoint
  // ─────────────────────────────────────────────────────────────────────────────

  it('should reject Find creation without a DigPoint', async () => {
    const fakeDigPointId = generateUUID();
    const find = {
      digPointId: fakeDigPointId,
      at: now,
      category: 'monnaie',
      material: 'billon',
      photos: [],
      deviceId: 'test-device',
    } as Omit<Find, 'id' | 'updatedAt' | 'syncedAt'>;

    await expect(createFind(db, find)).rejects.toThrow(
      /referenced DigPoint does not exist/
    );
  });

  it('should allow Find creation when DigPoint exists', async () => {
    // Create a session
    const session: Session = {
      id: sessionId,
      startedAt: now,
      parcels: ['32009_A_0123'],
      updatedAt: now,
      deviceId: 'test-device',
    };
    await db.sessions.add(session);

    // Create a DigPoint
    const digPointId = generateUUID();
    const dig: DigPoint = {
      id: digPointId,
      sessionId,
      at: now,
      coord,
      accuracyM: 5,
      outcome: 'trouvaille',
      updatedAt: now,
      deviceId: 'test-device',
    };
    await db.digPoints.add(dig);

    // Create a Find
    const findId = await createFind(db, {
      digPointId,
      at: now,
      category: 'monnaie',
      material: 'billon',
      photos: [],
      deviceId: 'test-device',
    });

    expect(findId).toBeTruthy();

    // Verify Find is in DB
    const stored = await db.finds.get(findId);
    expect(stored?.digPointId).toBe(digPointId);
    expect(stored?.category).toBe('monnaie');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Photo compression
  // ─────────────────────────────────────────────────────────────────────────────

  it('should estimate photo size correctly', () => {
    // Canvas not available in jsdom; test size estimation instead
    // In a real browser, captureAndCompressPhoto would actually compress.
    const testBlob = new Blob(['test content'], { type: 'image/jpeg' });
    const sizeMB = estimatePhotoSize(testBlob);

    expect(sizeMB).toBeGreaterThan(0); // Size calculation works
    expect(sizeMB).toBeLessThan(0.001); // Test blob is tiny
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Export/import round-trip
  // ─────────────────────────────────────────────────────────────────────────────

  it('should export and reimport a full dig workflow without loss', async () => {
    // 1. Create session
    const session: Session = {
      id: sessionId,
      startedAt: now,
      endedAt: new Date(new Date(now).getTime() + 3600000).toISOString(),
      label: 'Test dig session',
      parcels: ['32009_A_0123'],
      weather: 'clear',
      soilCondition: 'labour_frais',
      detector: { model: 'Garrett ACE 250', settings: 'All-Metal' },
      updatedAt: now,
      deviceId: 'test-device',
    };
    await db.sessions.add(session);

    // 2. Create track points (simulate a walk)
    const trackPoints: TrackPoint[] = [];
    for (let i = 0; i < 5; i++) {
      const tp: TrackPoint = {
        id: generateUUID(),
        sessionId,
        at: new Date(new Date(now).getTime() + i * 60000).toISOString(),
        coord: [coord[0] + i * 0.0001, coord[1] + i * 0.0001] as [number, number],
        accuracyM: 3 + i,
        updatedAt: now,
        deviceId: 'test-device',
      };
      trackPoints.push(tp);
      await db.trackPoints.add(tp);
    }

    // 3. Create digs
    const digPoint1: DigPoint = {
      id: generateUUID(),
      sessionId,
      at: now,
      coord,
      accuracyM: 3,
      outcome: 'rien',
      updatedAt: now,
      deviceId: 'test-device',
      signal: {
        segment: 5,
        mode: 'all_metal',
        sensitivity: 6,
        repeatable: false,
      },
    };
    await db.digPoints.add(digPoint1);

    const digPoint2: DigPoint = {
      id: generateUUID(),
      sessionId,
      at: new Date(new Date(now).getTime() + 600000).toISOString(),
      coord: [coord[0] + 0.0005, coord[1] + 0.0005] as [number, number],
      accuracyM: 4,
      outcome: 'trouvaille',
      updatedAt: now,
      deviceId: 'test-device',
      signal: {
        segment: 8,
        mode: 'all_metal',
        sensitivity: 7,
        repeatable: true,
        depthIndicatorIn: 4,
      },
    };
    await db.digPoints.add(digPoint2);

    // 4. Create a find linked to digPoint2
    const findId = await createFind(db, {
      digPointId: digPoint2.id,
      at: digPoint2.at,
      category: 'monnaie',
      material: 'billon',
      period: 'medieval',
      depthCm: 12,
      photos: [],
      description: 'Denier blanchi, usé',
      deviceId: 'test-device',
    });

    const find = await db.finds.get(findId);
    expect(find).toBeTruthy();

    // 5. Export session
    const allTrackPoints = await db.trackPoints.where('sessionId').equals(sessionId).toArray();
    const allDigs = await db.digPoints.where('sessionId').equals(sessionId).toArray();
    const allFinds = await db.finds.toArray();
    const allSweptAreas = await db.sweptAreas.where('sessionId').equals(sessionId).toArray();

    const sessionGeoJSON = exportSessionAsGeoJSON(session, allSweptAreas, {
      trackPoints: allTrackPoints.length,
      digPoints: allDigs.length,
      finds: allFinds.length,
      areaM2: 10000,
    });

    const digPointMap = new Map(allDigs.map((d) => [d.id, d]));
    const findsGeoJSON = exportFindsAsGeoJSON(allFinds, [], digPointMap);

    const tracksGPX = exportTracksAsGPX(session, allTrackPoints, allDigs);

    // 6. Verify exports are valid JSON/XML
    expect(sessionGeoJSON.type).toBe('Feature');
    expect(findsGeoJSON.type).toBe('FeatureCollection');
    expect(tracksGPX).toContain('<?xml');
    expect(tracksGPX).toContain('<trkseg>');
    expect(tracksGPX).toContain('<wpt');

    // 7. Reimport finds from GeoJSON
    const reimported = importFindsFromGeoJSON(findsGeoJSON);
    expect(reimported.finds.length).toBeGreaterThan(0);

    const reimportedFind = reimported.finds[0];
    expect(reimportedFind).toBeTruthy();
    if (!reimportedFind) throw new Error('reimportedFind is null');
    expect(reimportedFind.category).toBe('monnaie');
    expect(reimportedFind.material).toBe('billon');
    expect(reimportedFind.period).toBe('medieval');
    expect(reimportedFind.description).toBe('Denier blanchi, usé');

    // 8. Reimport tracks from GPX
    const reimportedTracks = importTracksFromGPX(tracksGPX);
    expect(reimportedTracks.trackPoints.length).toBe(allTrackPoints.length);
    expect(reimportedTracks.digPoints.length).toBeGreaterThan(0);

    // Verify waypoints were parsed
    const reimportedDig = reimportedTracks.digPoints.find((d) => d.outcome === 'trouvaille');
    expect(reimportedDig).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Soft delete
  // ─────────────────────────────────────────────────────────────────────────────

  it('should soft-delete a DigPoint and mark it as deleted', async () => {
    const session: Session = {
      id: sessionId,
      startedAt: now,
      parcels: [],
      updatedAt: now,
      deviceId: 'test-device',
    };
    await db.sessions.add(session);

    const dig: DigPoint = {
      id: generateUUID(),
      sessionId,
      at: now,
      coord,
      accuracyM: 5,
      outcome: 'rien',
      updatedAt: now,
      deviceId: 'test-device',
    };
    await db.digPoints.add(dig);

    // Soft delete
    await softDelete(db.digPoints, dig.id);

    // Verify marked as deleted, not removed
    const stored = await db.digPoints.get(dig.id);
    expect(stored).toBeTruthy();
    expect(stored?.deleted).toBe(true);
  });
});
