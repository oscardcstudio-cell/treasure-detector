/**
 * Type definitions for treasure-detector data model.
 * Source of truth for both Dexie (IndexedDB) and Supabase schemas.
 * Any change here cascades to:
 * - src/db/schema.ts (Dexie tables and indexes)
 * - supabase/migrations/ (Postgres schema, derived from this contract)
 * - Tests validating the invariants (src/db/__tests__/)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base types
// ─────────────────────────────────────────────────────────────────────────────

export type ISODate = string; // ISO 8601 UTC, e.g. "2026-08-08T14:35:00Z"
export type LonLat = [number, number]; // WGS84 (EPSG:4326), order [longitude, latitude] per GeoJSON spec
export type UUID = string; // v4 UUID

/**
 * Porté par TOUTE entité synchronisée.
 * Ces champs imposent l'idempotence : id généré côté client, la sync ne fait qu'upsert.
 */
export interface Syncable {
  id: UUID; // UUID généré CÔTÉ CLIENT — permet l'upsert idempotent
  updatedAt: ISODate; // dernière modif locale
  syncedAt?: ISODate; // null/absent = pas encore remonté à Supabase
  deviceId: string; // utile le jour où il y a un 2e appareil
  deleted?: boolean; // suppression logique : jamais de DELETE réel en local
}

// ─────────────────────────────────────────────────────────────────────────────
// Session: one prospecting outing
// ─────────────────────────────────────────────────────────────────────────────

export interface Session extends Syncable {
  startedAt: ISODate;
  endedAt?: ISODate;
  label?: string; // descriptive name for this session (e.g. "Champ nord après labour")
  parcels: string[]; // cadastral parcel references prospected (e.g. ["32009_A_0123", "32009_B_0456"])
  weather?: string; // free text, e.g. "couvert, vent ouest 15 km/h"
  soilCondition?: 'labour_frais' | 'chaume' | 'prairie' | 'sec' | 'gele' | 'humide';
  detector?: {
    model: string; // e.g. "Garrett ACE 250"
    settings?: string; // free text, e.g. "All-Metal, sensibilité 6"
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GPS trace
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw GPS point. One point per watchPosition event.
 * NOT interpolated across gaps — see SweptArea for coverage model.
 */
export interface TrackPoint extends Syncable {
  sessionId: UUID; // reference to Session.id
  at: ISODate; // timestamp of this fix
  coord: LonLat; // WGS84 (EPSG:4326)
  accuracyM: number; // horizontal accuracy in meters (from watchPosition API)
  altitudeM?: number; // elevation above sea level (if available)
  speedMs?: number; // instantaneous speed (m/s) if available
}

/**
 * Derived from TrackPoint: buffer around the trace.
 * Encodes honest coverage: ratisse (dense quadrillage) vs passage_rapide (quick pass, no blocking).
 */
export interface SweptArea extends Syncable {
  sessionId: UUID;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon; // WGS84
  swathWidthM: number; // default 0.9 (arc of Garrett ACE 250 6.5"×9" coil), adjustable
  coverage: 'ratisse' | 'passage_rapide'; // derived from mean speed of the segment
  computedAt: ISODate; // when this was calculated
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector signal (Garrett ACE 250 specific)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signal from the metal detector. NOT a numeric conductivity.
 * The Garrett ACE 250 displays a 12-segment Target ID scale, not raw VDI values.
 * This schema models what the machine actually shows.
 */
export interface DetectorSignal {
  segment: number; // 1..12, position of the Target ID cursor
  mode: 'all_metal' | 'jewelry' | 'custom' | 'relics' | 'coins'; // ACE 250 discrimination modes
  sensitivity: number; // 1..8 on the ACE 250
  depthIndicatorIn?: 0 | 2 | 4 | 6 | 8; // "coin depth" reading in inches (if shown on display)
  repeatable: boolean; // is the signal consistent when scanning the same spot twice?
  tone?: 'bas' | 'moyen' | 'haut'; // pitch of the audio signal if noted
}

// ─────────────────────────────────────────────────────────────────────────────
// DigPoint: a hole dug (signal, with or without a find)
// ─────────────────────────────────────────────────────────────────────────────

export interface DigPoint extends Syncable {
  sessionId: UUID;
  at: ISODate;
  coord: LonLat; // WGS84 (EPSG:4326)
  accuracyM: number;
  depthCm?: number; // depth dug
  signal?: DetectorSignal; // detector reading at this spot
  presetId?: string; // ID of the detector preset active when this hole was dug (for post-hoc evaluation)
  outcome: 'rien' | 'ferraille' | 'trouvaille'; // what came out of the hole
  findId?: string; // reference to Find.id if outcome is 'trouvaille' (INVARIANT: if findId exists, Find must exist)
  note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DetectorPreset: recommended settings for a location
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computed settings derived from the scoring engine, not user input.
 * Encoded in a compact card format readable in bright sun without gloves (§9.8).
 */
export interface DetectorPreset {
  id: string; // e.g. 'coeur_village', 'villa_champ_ouvert', 'moulin_bief'
  label: string; // displayed large on screen
  mode: DetectorSignal['mode'];
  sensitivity: [number, number]; // range 1..8, lower bound = point where chatter starts
  notch: 'aucune' | 'fer_bas_seulement'; // discrimination setting
  coil: 'stock_6.5x9' | 'sniper_4.5'; // coil selection
  sweep: 'tres_lent' | 'lent' | 'normal'; // recommended sweep speed
  digRule: string; // e.g. "creuse tout signal répétable, même faible"
  expect: string[]; // expected artifacts, e.g. ["billon", "boucles", "appliques", "plombs"]
  why: string; // the dominant scoring criterion that triggered this preset
}

// ─────────────────────────────────────────────────────────────────────────────
// SurfaceObservation: artifact seen on surface, no digging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tile, pottery, or other cultural material observed on the surface.
 * Cheaper than digging and often more diagnostic than metal detection.
 * Examples: tegulae (flat tiles with rebate), imbrices (curved roof tiles),
 * common pottery, Samian ware (sigillée), mortar.
 */
export interface SurfaceObservation extends Syncable {
  sessionId: UUID;
  at: ISODate;
  coord: LonLat; // WGS84 (EPSG:4326)
  kind:
    | 'tegulae'
    | 'imbrex'
    | 'ceramique_commune'
    | 'sigillee'
    | 'mortier'
    | 'silex'
    | 'scorie'
    | 'pierre_taillee'
    | 'os'
    | 'autre';
  density: 'isole' | 'diffus' | 'concentre' | 'tres_dense'; // concentration at this spot
  collected: boolean; // was it picked up or left in place?
  photos: string[]; // keys to photo blobs in IndexedDB (or Supabase Storage URLs after sync)
  note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Find: an artifact extracted from a DigPoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * INVARIANT: A Find cannot exist without a DigPoint.
 * A Find references a DigPoint, not the reverse.
 * Create the DigPoint first, then the Find if something was recovered.
 */
export interface Find extends Syncable {
  digPointId: UUID; // REQUIRED reference to DigPoint.id (INVARIANT)
  at: ISODate;
  category:
    | 'monnaie'
    | 'fibule'
    | 'boucle'
    | 'applique'
    | 'plomb'
    | 'bague'
    | 'militaria'
    | 'outil'
    | 'ferrure'
    | 'indetermine'
    | 'autre';
  material: 'or' | 'argent' | 'billon' | 'bronze' | 'cuivre' | 'plomb' | 'fer' | 'etain' | 'autre';
  period?: 'prehistoire' | 'protohistoire' | 'antique' | 'medieval' | 'moderne' | 'contemporain' | 'indetermine';
  depthCm?: number; // depth of extraction (might differ from DigPoint.depthCm if nested)
  photos: string[]; // keys to photo blobs (in situ, after cleaning, details)
  description?: string; // free text: wear, cuts, marks, etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreCell: output of the scoring engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One hexagonal cell (H3 resolution ~10, ~65 m sides) with its score and contributions.
 * Why this cell is hot is encoded in the contributions, not hidden in a black box.
 */
export interface ScoreCell {
  h3: string; // H3 cell index
  score: number; // 0..100
  contributions: Array<{
    criterion: string; // e.g. "Noyau villageois d'Armous" — libellé humain, PAS une clé de lookup
    criterionId: string; // e.g. "armous_village" — id du critère, clé de criterionToPreset
    weight: number; // base weight in config/scoring.json
    value: number; // 0..1, presence or severity of this criterion
    evidence: string; // human-readable explanation
    source?: string; // data source (e.g. "cadastre_napoleon", "lidar_svf")
  }>;
  flagged?: {
    reason: 'ZPPA' | 'MH' | 'site_classe' | 'bati'; // why this cell is flagged
    detail: string; // e.g. "Monument historique — château de Montesquiou"
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export formats (GeoJSON, GPX)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GeoJSON Feature for export/import of sessions and finds.
 * Includes swathWidthM, coverage, accuracyM so a reimported session is honest.
 */
export interface ExportedSession {
  type: 'Feature';
  properties: Session & {
    totalTrackPoints: number;
    totalDigPoints: number;
    totalFinds: number;
    sweptAreaMeters2: number; // computed area of SweptArea
    export_version: '1.0';
  };
  geometry: GeoJSON.MultiPolygon; // union of all SweptArea polygons for this session
}

/**
 * GeoJSON FeatureCollection for all finds and surface observations.
 */
export interface FindsGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: (Find | SurfaceObservation) & { source: 'find' | 'surface_observation' };
    geometry: GeoJSON.Point; // WGS84
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate system reference (documented, never computed in the app)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * COORDINATE SYSTEMS — critical reference for integration
 *
 * | Context | EPSG | Notes |
 * |---------|------|-------|
 * | WMTS tiles (IGN Cassini, état-major, ortho, plans) | EPSG:3857 (Web Mercator) | Platform Mercator (PM). Tiles are in this projection. |
 * | App storage (Dexie and Supabase) | EPSG:4326 (WGS84) | [longitude, latitude] per GeoJSON. Why: standard for web, simplest for sync. |
 * | LiDAR HD, RGE ALTI, Cadastre Napoléon, BD TOPO | EPSG:2154 (Lambert-93) | French national projection. |
 * | Reprojection | Never in the app | Always in `tools/prep/` (Python + GDAL). Decalage of projection non-detected is the most silent error in the project. |
 *
 * Rule: never do projection math in the browser. If you find yourself computing a transformation,
 * that's a bug — the data should already be in EPSG:4326 by the time it reaches the app.
 */

/**
 * Sync contract (how client ↔ server synchronization works)
 *
 * | Principle | Rule |
 * |-----------|------|
 * | Idempotence | Every upsert is idempotent. Client ID (UUID) is the key. Replaying the same sync file twice does not duplicate. |
 * | Batching | Entities are sent in batches (typically 100-1000 per request), never one-by-one. Network efficiency on 4G. |
 * | Deletion | Soft delete only: `deleted: true`. Real `DELETE` SQL is never issued from the client. If an entity is deleted locally and sync fails, the entity does not resurrect. |
 * | Sync-only fields | Sync modifies only `syncedAt`. It never touches business data (content, coordinates, timestamps). A sync bug must not corrupt a find. |
 * | Sense | Unidirectional in v1: phone → server. Downstream (server → phone) is not implemented until multi-device is decided (§12). |
 * | File persistence | The sync queue lives in IndexedDB, survives browser close/reload, and continues from where it left off. |
 * | Photos | Sent separately, only over Wi-Fi, with their own sync state. Metadata syncs first; blobs second and conditional. |
 *
 * Invariants enforced at the type level:
 * 1. Every Syncable has `id`, `updatedAt`, `deviceId`, `syncedAt` (optional).
 * 2. Deletion is `deleted: true` in the entity, not a removal from IndexedDB.
 * 3. A Find **must** reference an existing DigPoint (type-level and runtime assertion).
 * 4. TrackPoints are never interpolated across a session gap (segments are distinct).
 * 5. GPS accuracy is inherent in every coordinate (`accuracyM` field).
 * 6. No migrations without versioning on both Dexie and Supabase.
 * 7. No secrets (service_role key, passwords) ever touch the client bundle.
 */
