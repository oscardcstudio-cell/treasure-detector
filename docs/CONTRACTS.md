# CONTRACTS.md — Data contract for treasure-detector (T0.2, LOCKED)

**Date locked**: 2026-08-08
**Status**: Frozen — all agents in phases 1 and 3 code against this contract.

This document defines the single source of truth for data structures, coordinate systems, synchronization rules, and invariants. Any change to this contract requires explicit authorization; changes are NOT automatic from code changes.

---

## Table of Contents

1. [Base types and interfaces](#base-types-and-interfaces)
2. [Coordinate systems (critical)](#coordinate-systems-critical)
3. [Invariants (7 rules enforced by code, not discipline)](#invariants-7-rules-enforced-by-code-not-discipline)
4. [Synchronization contract](#synchronization-contract)
5. [Export formats](#export-formats)
6. [Migrations versioning](#migrations-versioning)
7. [RLS and security](#rls-and-security)

---

## Base types and interfaces

All types are defined in `src/db/types.ts` and are TypeScript interfaces. They extend the `Syncable` interface.

### Syncable (required on all synchronizable entities)

```typescript
interface Syncable {
  id: string;              // UUID v4, generated on CLIENT SIDE
  updatedAt: ISODate;      // Last local modification (ISO 8601 UTC)
  syncedAt?: ISODate;      // Last sync to Supabase (null/absent = never synced)
  deviceId: string;        // Device identifier (reserved for future multi-device support)
  deleted?: boolean;       // Soft delete: never hard DELETE, always set to true
}
```

**Why**: Client-generated UUIDs enable idempotent upsert. Replaying the same sync file twice does not create duplicates.

### Session

One prospecting outing (a few hours to a day in the field).

```typescript
interface Session extends Syncable {
  startedAt: ISODate;
  endedAt?: ISODate;
  label?: string;                                        // e.g. "Champ nord après labour"
  parcels: string[];                                     // Cadastral references e.g. ["32009_A_0123"]
  weather?: string;                                      // Free text
  soilCondition?: 'labour_frais'|'chaume'|'prairie'|'sec'|'gele'|'humide';
  detector?: {
    model: string;                                       // e.g. "Garrett ACE 250"
    settings?: string;                                   // Free text
  };
}
```

### TrackPoint

Raw GPS fix from `watchPosition` API. One point per event, no interpolation.

```typescript
interface TrackPoint extends Syncable {
  sessionId: UUID;
  at: ISODate;
  coord: LonLat;            // WGS84 [lon, lat]
  accuracyM: number;        // Horizontal accuracy (meters) from watchPosition
  altitudeM?: number;
  speedMs?: number;
}
```

### SweptArea

Derived from TrackPoint: buffer around the trace. Encodes honest coverage.

```typescript
interface SweptArea extends Syncable {
  sessionId: UUID;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;  // WGS84
  swathWidthM: number;      // Default 0.9 m (arc of Garrett ACE 250), adjustable
  coverage: 'ratisse' | 'passage_rapide';             // Derived from mean speed
  computedAt: ISODate;
}
```

**Coverage logic** (§6.1 of PLAN):
- Mean segment speed ≤ 0.45 m/s (~1.6 km/h) → `ratisse` (full/solid render, blocks re-traversal)
- Speed > 0.45 m/s → `passage_rapide` (hatched render, doesn't block re-traversal)

### DetectorSignal

What the Garrett ACE 250 display shows: a 12-segment Target ID scale, not numeric VDI values.

```typescript
interface DetectorSignal {
  segment: number;          // 1..12
  mode: 'all_metal'|'jewelry'|'custom'|'relics'|'coins';
  sensitivity: number;      // 1..8
  depthIndicatorIn?: 0|2|4|6|8;  // If displayed ("coin depth")
  repeatable: boolean;      // Consistent on rescanning?
  tone?: 'bas'|'moyen'|'haut';
}
```

### DigPoint

A hole dug: recording the detector signal, depth, and outcome.

```typescript
interface DigPoint extends Syncable {
  sessionId: UUID;
  at: ISODate;
  coord: LonLat;            // WGS84
  accuracyM: number;
  depthCm?: number;
  signal?: DetectorSignal;
  presetId?: string;        // ID of the detector preset active at this spot
  outcome: 'rien'|'ferraille'|'trouvaille';
  findId?: string;          // INVARIANT: if present, Must reference a Find
  note?: string;
}
```

### Find

An artifact extracted from a DigPoint.

```typescript
interface Find extends Syncable {
  digPointId: UUID;         // REQUIRED — INVARIANT 1: DigPoint must exist
  at: ISODate;
  category: 'monnaie'|'fibule'|'boucle'|'applique'|'plomb'|'bague'|'militaria'
          |'outil'|'ferrure'|'indetermine'|'autre';
  material: 'or'|'argent'|'billon'|'bronze'|'cuivre'|'plomb'|'fer'|'etain'|'autre';
  period?: 'prehistoire'|'protohistoire'|'antique'|'medieval'|'moderne'|'contemporain'|'indetermine';
  depthCm?: number;
  photos: string[];         // Photo blob keys (IndexedDB or Supabase Storage URLs)
  description?: string;
}
```

### SurfaceObservation

Tile, pottery, or other cultural material observed on the surface without digging.

```typescript
interface SurfaceObservation extends Syncable {
  sessionId: UUID;
  at: ISODate;
  coord: LonLat;            // WGS84
  kind: 'tegulae'|'imbrex'|'ceramique_commune'|'sigillee'|'mortier'
      |'silex'|'scorie'|'pierre_taillee'|'os'|'autre';
  density: 'isole'|'diffus'|'concentre'|'tres_dense';
  collected: boolean;
  photos: string[];
  note?: string;
}
```

### DetectorPreset

Computed settings derived from the scoring engine, displayed as a compact card.

```typescript
interface DetectorPreset {
  id: string;               // e.g. 'coeur_village', 'villa_champ_ouvert'
  label: string;            // Displayed large on screen
  mode: DetectorSignal['mode'];
  sensitivity: [number, number];  // Range 1..8
  notch: 'aucune'|'fer_bas_seulement';
  coil: 'stock_6.5x9'|'sniper_4.5';
  sweep: 'tres_lent'|'lent'|'normal';
  digRule: string;          // e.g. "creuse tout signal répétable, même faible"
  expect: string[];         // Expected artifacts
  why: string;              // Scoring criterion that triggered this
}
```

### ScoreCell

Output of the scoring engine: one H3 hexagonal cell with its score and contributions.

```typescript
interface ScoreCell {
  h3: string;               // H3 cell index
  score: number;            // 0..100
  contributions: Array<{
    criterion: string;
    weight: number;
    value: number;          // 0..1
    evidence: string;
    source?: string;
  }>;
  flagged?: {
    reason: 'ZPPA'|'MH'|'site_classe'|'bati';
    detail: string;
  };
}
```

---

## Coordinate systems (critical)

**One wrong projection = data offset by tens of meters, invisible until it's useless.**

| Context | EPSG | Notes | Responsibility |
|---------|------|-------|-----------------|
| **WMTS tiles** (Cassini, état-major, ortho, plans) | EPSG:3857 (Web Mercator, PM) | Tiles are served in this projection. MapLibre handles conversion. | Browser (automatic via MapLibre) |
| **App storage** (Dexie, Postgres) | EPSG:4326 (WGS84) | `[longitude, latitude]` per GeoJSON. Simple, standard, what the GPS outputs. | App responsibility: all Syncable entities use this. |
| **LiDAR HD, RGE ALTI, Cadastre Napoléon, BD TOPO** | EPSG:2154 (Lambert-93) | French national projection. Data arrives in this CRS. | `tools/prep/` (Python + GDAL) — reprojection happens here and ONLY here. |

### Rule

**Never compute a projection transformation in the browser or in Postgres.**

If you find yourself writing code that mentions `EPSG:`, `proj.`, or `reproject`:
- ❌ **WRONG**: That code belongs in `tools/prep/`, not in the app or migrations.
- ✅ **RIGHT**: Data arrives in the app already in EPSG:4326.

The pipeline is:
1. Source data (LiDAR, cadastre) arrives in EPSG:2154.
2. `tools/prep/` reprojects to EPSG:4326 and outputs GeoJSON / PMTiles.
3. App consumes the reprojected data.

Verify: every file in `data/derived/` is in EPSG:4326 (or equivalent Web Mercator for PMTiles, which MapLibre handles). If not, the source is wrong.

---

## Invariants (7 rules enforced by code, not discipline)

**These are not suggestions. Code must enforce them, not rely on a human remembering.**

### 1. A Find cannot exist without a DigPoint

**Enforcement**: Runtime assertion in `src/db/schema.ts::createFind()`.

```typescript
// ✅ CORRECT: DigPoint first, then Find
const digPointId = await createDigPoint(db, digPoint);
const findId = await createFind(db, { ...find, digPointId });

// ❌ WRONG: trying to create a Find without a DigPoint
// This throws an error immediately.
const findId = await createFind(db, { ...find, digPointId: 'nonexistent-id' });
// → Error: "Cannot create Find: referenced DigPoint does not exist"
```

**Why**: Without this, you lose the location of the find, and the find learns nothing to the model.

### 2. DigPoint with `outcome: 'rien'` are as valuable as finds

**Enforcement**: No automatic purge logic, no filtering in export, no suppression of negatives.

The absence of an artifact at a location is evidence. Negatives calibrate the model in v2. If you have 100 holes with no finds and 1 hole with a find, the 100 negatives are not noise — they are the foundation of the model.

### 3. Every export includes `swathWidthM`, `coverage`, and `accuracyM`

**Enforcement**: Export schemas (GeoJSON, GPX) must include these fields.

A trace recorded at 15 m accuracy is not equivalent to one at 3 m accuracy. If you reimport a file, it must carry enough metadata to know what area was actually covered.

### 4. Every Syncable entity has a client-generated UUID and extends `Syncable`

**Enforcement**: Type system (every table column `id` is UUID).

If a server ever generates an ID, idempotence breaks: replaying the sync file creates duplicates. The client owns the ID.

### 5. Deletion is always soft (`deleted: true`), never a SQL DELETE

**Enforcement**: Utility function `softDelete()` in `src/db/schema.ts`; app code never calls `table.delete()`.

If an entity is deleted locally and the sync fails, a hard delete means the entity is lost. Soft delete means it can be recovered if sync retries.

### 6. Sync never modifies business data, only `syncedAt`

**Enforcement**: Sync pipeline only writes `syncedAt` on success.

A bug in the sync pipeline must not corrupt a find's coordinates or depth. `syncedAt` is the only field that changes during sync.

### 7. No interpolation in a straight line across a GPS gap

**Enforcement**: TrackPoint arrays are segments, not continuous.

If the screen goes dark, the network drops, or the device is in a pocket for 20 minutes, that's a break in the trace. TrackPoints on either side of the break are separate segments. Never connect them with a straight line — that invents coverage where none happened.

**In code**: `SweptArea` computes buffers from TrackPoint arrays; it must respect segment boundaries. If a TrackPoint's `at` timestamp has a gap > (arbitrary threshold, e.g., 5 minutes) from the previous point, it's a new segment.

---

## Synchronization contract

### Principles

| Principle | Enforcement |
|-----------|------------|
| **Idempotence** | Every upsert uses client ID as the key. No server-generated IDs. |
| **Batching** | 100–1000 entities per request, never one-by-one. |
| **Soft delete** | `deleted: true` in the entity, never SQL DELETE. |
| **Metadata-only sync** | Sync writes only `syncedAt`. Business data is immutable once synced. |
| **Unidirectional (v1)** | Phone → Supabase only. No downstream sync. |
| **Queue persistence** | Sync queue lives in Dexie, survives browser close/reload. |

### Sync flow

```
1. User action on phone (e.g., records a find)
   ↓
2. Entity is inserted into Dexie (IndexedDB)
   ↓
3. Entry is added to syncQueue table
   ↓
4. When network returns, sync pipeline starts
   ↓
5. Batch entities by type and send to Supabase via `supabase-js`
   ↓
6. On success: update `syncedAt` on each entity
   ↓
7. Remove entries from syncQueue
   ↓
8. If partial failure: log error, backoff, retry on next network return
```

### Sync queue schema

```typescript
{
  entityType: 'find' | 'digPoint' | 'trackPoint' | ... ;
  entityId: UUID;
  changeType: 'upsert' | 'delete';
  payload: unknown;           // Serialized entity
  createdAt: ISODate;
  attemptCount: number;       // Retry counter
  lastError?: string;         // Last error message
}
```

### Supabase-side idempotence

The Postgres schema must implement:

```sql
-- For each table (find, digPoint, etc.):
INSERT INTO finds (id, digPointId, at, ...) 
VALUES ($1, $2, $3, ...)
ON CONFLICT (id) DO UPDATE SET
  digPointId = EXCLUDED.digPointId,
  at = EXCLUDED.at,
  ...,
  updatedAt = EXCLUDED.updatedAt,
  syncedAt = NOW();
```

The `ON CONFLICT` clause ensures that replaying the same row twice does not create a duplicate.

---

## Export formats

### GeoJSON (sessions)

One GeoJSON Feature per session, with all session metadata and the union of swept areas as geometry.

```json
{
  "type": "Feature",
  "properties": {
    "id": "uuid...",
    "startedAt": "2026-08-08T...",
    "endedAt": "2026-08-08T...",
    "label": "Champ nord",
    "parcels": ["32009_A_0123"],
    "weather": "...",
    "soilCondition": "labour_frais",
    "swathWidthM": 0.9,
    "totalTrackPoints": 1234,
    "totalDigPoints": 45,
    "totalFinds": 12,
    "sweptAreaMeters2": 12345.67,
    "export_version": "1.0"
  },
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [ ... ]
  }
}
```

### GeoJSON (finds and surface observations)

One FeatureCollection with all finds and surface observations.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "source": "find",
        "id": "uuid...",
        "digPointId": "uuid...",
        "category": "monnaie",
        "material": "billon",
        "period": "medieval",
        "description": "Denier blanchi, usé, revers illisible"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [0.1908, 43.5742]
      }
    },
    ...
  ]
}
```

### GPX (tracks)

Standard `<trk>` with `<trkseg>` respecting segment boundaries (no artificial bridges across gaps).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Session: Champ nord</name>
    <time>2026-08-08T14:35:00Z</time>
  </metadata>
  <trk>
    <name>Track</name>
    <trkseg>
      <!-- Segment 1: continuous trace -->
      <trkpt lat="43.5742" lon="0.1908">
        <ele>250.5</ele>
        <time>2026-08-08T14:35:00Z</time>
      </trkpt>
      ...
    </trkseg>
    <trkseg>
      <!-- Segment 2: after a gap (screen off, network drop, etc.) -->
      <trkpt lat="43.5750" lon="0.1920">
        <ele>251.2</ele>
        <time>2026-08-08T14:55:00Z</time>
      </trkpt>
      ...
    </trkseg>
  </trk>
</gpx>
```

---

## Migrations versioning

Both Dexie (client) and Supabase (server) schemas are versioned and derived from this contract.

### Dexie migrations

File: `src/db/schema.ts`

```typescript
class TreasureDB extends Dexie {
  constructor() {
    super('TreasureDetector');

    this.version(1).stores({
      sessions: '...',
      trackPoints: '...',
      // ... (v1 schema)
    });

    this.version(2).stores({
      // ... (v2 schema changes)
    }).upgrade((tx) => migrateV1ToV2(tx));
  }
}

async function migrateV1ToV2(tx: Dexie.Transaction) {
  // Transform v1 data to v2
  const table = tx.table('finds');
  await table.toCollection().modify((find) => {
    // Add new field with default if it doesn't exist
    if (!find.newField) {
      find.newField = 'default';
    }
  });
}
```

### Supabase migrations

Directory: `supabase/migrations/`

Each migration file is numbered and versioned:

```sql
-- supabase/migrations/20260808_001_initial_schema.sql

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  label TEXT,
  parcels TEXT[],
  weather TEXT,
  soil_condition TEXT,
  detector_model TEXT,
  detector_settings TEXT,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own sessions"
  ON sessions
  FOR SELECT
  USING (auth.uid() = auth.uid()); -- Placeholder; real policy below

-- ... (rest of schema)
```

### Rule

**Never add a field to only one side (Dexie or Postgres).** A silent sync bug is the result: the field exists locally but isn't synced, or vice versa.

Before merging any schema change:
1. Update this contract (`CONTRACTS.md`).
2. Update `src/db/schema.ts` (Dexie).
3. Add a migration file to `supabase/migrations/`.
4. Verify both sides match the contract.

---

## RLS and security

### Row Level Security (Supabase)

**Mandatory**: RLS is active on every table from migration 001.

```sql
-- Example policy for finds:
CREATE POLICY "Users can only see their own finds"
  ON finds
  FOR SELECT
  USING (auth.uid() = auth.uid());  -- Real policy: based on a user_id column

CREATE POLICY "Users can only insert their own finds"
  ON finds
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

**Verify in v1 test**: Connect as an anonymous user (using the `anon` key from `supabase-js`) and confirm that you cannot read any table. If you can, RLS is broken.

### API keys

| Key | Where | Visible | Secret? |
|-----|-------|---------|---------|
| `VITE_SUPABASE_URL` | App bundle (front-end) | Yes | No — it's a URL. |
| `VITE_SUPABASE_ANON_KEY` | App bundle (front-end) | Yes | No — it's the anonymous key, designed to be public. **But only if RLS is active.** |
| `SUPABASE_SERVICE_ROLE_KEY` | CLI (local machine only) | No | **YES** — Never in git, never in the bundle, never in CI output. |

### Scan for secrets in CI

GitHub Actions step:
```yaml
- name: Scan for secrets
  run: |
    npm install -g gitleaks
    gitleaks detect --verbose
```

This catches `SUPABASE_SERVICE_ROLE_KEY` or similar if accidentally committed.

---

## Change log

| Date | Change | Locked by |
|------|--------|-----------|
| 2026-08-08 | Initial contract (v1) | T0.2 |

---

## References

- `src/db/types.ts` — TypeScript interface definitions
- `src/db/schema.ts` — Dexie schema implementation
- `supabase/migrations/` — Postgres schema (mirrors this contract)
- `PLAN.md` §6, §5.2, §5.5, §5.6 — Rationale and design decisions
