/**
 * Dexie schema for treasure-detector.
 * Source of truth for IndexedDB structure on the client side.
 * Must be kept in sync with supabase/migrations/ (same contracts).
 *
 * Version history:
 * v1: Initial schema with Session, TrackPoint, SweptArea, DigPoint, Find, SurfaceObservation, ScoreCell, DetectorPreset
 */

import Dexie, { Table } from 'dexie';
import {
  Session,
  TrackPoint,
  SweptArea,
  DigPoint,
  Find,
  DetectorPreset,
  SurfaceObservation,
  ScoreCell,
  UUID,
} from './types';

export class TreasureDB extends Dexie {
  sessions!: Table<Session>;
  trackPoints!: Table<TrackPoint>;
  sweptAreas!: Table<SweptArea>;
  digPoints!: Table<DigPoint>;
  finds!: Table<Find>;
  detectorPresets!: Table<DetectorPreset>;
  surfaceObservations!: Table<SurfaceObservation>;
  scoreCells!: Table<ScoreCell>;

  // Sync queue: persisted list of changes awaiting upload to Supabase
  syncQueue!: Table<{
    id?: number; // internal Dexie ID
    entityType: string; // 'session', 'trackPoint', etc.
    entityId: UUID;
    changeType: 'upsert' | 'delete';
    payload: unknown;
    createdAt: string; // ISO date
    attemptCount: number;
    lastError?: string;
  }>;

  constructor() {
    super('TreasureDetector');
    this.version(1).stores({
      sessions: '++id, &id, deviceId, startedAt',
      trackPoints: '++id, &id, sessionId, at, syncedAt',
      sweptAreas: '++id, &id, sessionId, computedAt',
      digPoints: '++id, &id, sessionId, at, syncedAt, outcome',
      finds: '++id, &id, digPointId, at, syncedAt',
      detectorPresets: '&id',
      surfaceObservations: '++id, &id, sessionId, at, syncedAt, kind',
      scoreCells: '&h3',
      syncQueue: '++id, entityType, createdAt, attemptCount',
    });

    // Hook: validate Find.digPointId exists before insert/update
    this.finds.hook('creating', (_primKey, obj) => {
      validateFindHasDigPoint(obj as Find);
    });

    this.finds.hook('updating', (changes) => {
      // changes contains only the changed properties; fetch full object
      if ('digPointId' in changes && changes.digPointId !== undefined) {
        // If digPointId is being changed, validate it
        if (!changes.digPointId) {
          throw new Error('Find.digPointId cannot be null or empty');
        }
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertions for invariants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * INVARIANT 1: A Find cannot exist without a DigPoint.
 * Always validate before insert/update.
 */
async function validateFindHasDigPoint(find: Find): Promise<void> {
  if (!find.digPointId) {
    throw new Error('Find.digPointId is required — cannot create Find without a DigPoint');
  }

  // Optional: check that the referenced DigPoint exists
  // Note: this requires access to db, so it's moved to a utility function
  // const db = getDatabase();
  // const digPoint = await db.digPoints.get(find.digPointId);
  // if (!digPoint) {
  //   throw new Error(`Find references non-existent DigPoint: ${find.digPointId}`);
  // }
}

/**
 * Create a Find with runtime assertion.
 * This is the canonical way to insert a Find into the database.
 * @throws if digPointId does not reference an existing DigPoint
 */
export async function createFind(
  db: TreasureDB,
  find: Omit<Find, 'id' | 'updatedAt' | 'syncedAt'> & { id?: UUID }
): Promise<UUID> {
  // Validate the DigPoint exists
  const digPoint = await db.digPoints.get(find.digPointId);
  if (!digPoint) {
    throw new Error(
      `Cannot create Find: referenced DigPoint does not exist (digPointId: ${find.digPointId})`
    );
  }

  // Assign defaults if missing
  const now = new Date().toISOString();
  const findWithDefaults: Find = {
    ...find,
    id: find.id || generateUUID(),
    updatedAt: now,
    deleted: false,
  } as Find;

  // Insert and return the ID
  await db.finds.add(findWithDefaults);
  return findWithDefaults.id;
}

/**
 * Soft delete: mark an entity as deleted without removing it from the DB.
 * Required for proper sync semantics.
 */
export async function softDelete<T extends { id: UUID; deleted?: boolean; updatedAt: string }>(
  table: Table<T>,
  id: UUID
): Promise<void> {
  const now = new Date().toISOString();
  // Use put with a partial update by fetching and merging
  const current = await table.get(id);
  if (current) {
    const updated = { ...current, deleted: true, updatedAt: now };
    await table.put(updated);
  }
}

/**
 * Generate a UUID v4.
 * Note: In production, use a proper UUID library.
 * This is a placeholder for testing.
 */
export function generateUUID(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration example: v1 -> v2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example of a Dexie migration.
 * This would be added to the TreasureDB constructor as:
 *
 *   this.version(2).stores({ ... }).upgrade((tx) => migrateV1ToV2(tx));
 *
 * The upgrade function receives a Transaction and can read/write all tables.
 */
export async function migrateV1ToV2(): Promise<void> {
  // Example: add a new field to DigPoint
  // (In real migrations, this would be handled by Dexie's automatic schema upgrade)
  // For now, this is a no-op, but demonstrates the pattern.

  // You would typically do something like:
  // const db = new TreasureDB();
  // const digPointsTable = db.digPoints;
  // await digPointsTable.toCollection().modify((digPoint) => {
  //   // Add a new field if it doesn't exist
  //   if (!digPoint.newField) {
  //     digPoint.newField = 'default_value';
  //   }
  // });
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let dbInstance: TreasureDB | null = null;

export function getDatabase(): TreasureDB {
  if (!dbInstance) {
    dbInstance = new TreasureDB();
  }
  return dbInstance;
}

/**
 * For testing: allow resetting the database instance.
 */
export function resetDatabaseInstance(): void {
  dbInstance = null;
}

/**
 * For testing: provide a mock or test instance.
 */
export function setDatabaseInstance(db: TreasureDB): void {
  dbInstance = db;
}
