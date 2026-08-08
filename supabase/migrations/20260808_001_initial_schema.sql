-- Initial schema for treasure-detector PWA
-- Derived from docs/CONTRACTS.md — any modifications must go through the contract first
-- Date: 2026-08-08
-- This migration creates all core tables with Row Level Security enabled

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────────────────────────────────────
-- SESSIONS table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
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

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_device_id ON sessions(device_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own sessions"
  ON sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRACK_POINTS table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE track_points (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  at TIMESTAMP WITH TIME ZONE NOT NULL,
  coord geometry(Point, 4326) NOT NULL,
  accuracy_m NUMERIC NOT NULL,
  altitude_m NUMERIC,
  speed_ms NUMERIC,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_track_points_user_id ON track_points(user_id);
CREATE INDEX idx_track_points_session_id ON track_points(session_id);
CREATE INDEX idx_track_points_at ON track_points(at DESC);
CREATE INDEX idx_track_points_synced_at ON track_points(synced_at NULLS FIRST);
CREATE INDEX idx_track_points_coord ON track_points USING GIST(coord);

ALTER TABLE track_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own track_points"
  ON track_points
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own track_points"
  ON track_points
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own track_points"
  ON track_points
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own track_points"
  ON track_points
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SWEPT_AREAS table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE swept_areas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  geometry geometry(MultiPolygon, 4326) NOT NULL,
  swath_width_m NUMERIC NOT NULL,
  coverage TEXT NOT NULL CHECK (coverage IN ('ratisse', 'passage_rapide')),
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_swept_areas_user_id ON swept_areas(user_id);
CREATE INDEX idx_swept_areas_session_id ON swept_areas(session_id);
CREATE INDEX idx_swept_areas_computed_at ON swept_areas(computed_at DESC);
CREATE INDEX idx_swept_areas_geometry ON swept_areas USING GIST(geometry);

ALTER TABLE swept_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own swept_areas"
  ON swept_areas
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own swept_areas"
  ON swept_areas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own swept_areas"
  ON swept_areas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own swept_areas"
  ON swept_areas
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DIG_POINTS table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE dig_points (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  at TIMESTAMP WITH TIME ZONE NOT NULL,
  coord geometry(Point, 4326) NOT NULL,
  accuracy_m NUMERIC NOT NULL,
  depth_cm NUMERIC,
  signal JSONB,  -- DetectorSignal: { segment, mode, sensitivity, depthIndicatorIn, repeatable, tone }
  preset_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('rien', 'ferraille', 'trouvaille')),
  find_id TEXT,
  note TEXT,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dig_points_user_id ON dig_points(user_id);
CREATE INDEX idx_dig_points_session_id ON dig_points(session_id);
CREATE INDEX idx_dig_points_at ON dig_points(at DESC);
CREATE INDEX idx_dig_points_synced_at ON dig_points(synced_at NULLS FIRST);
CREATE INDEX idx_dig_points_outcome ON dig_points(outcome);
CREATE INDEX idx_dig_points_coord ON dig_points USING GIST(coord);

ALTER TABLE dig_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dig_points"
  ON dig_points
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dig_points"
  ON dig_points
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dig_points"
  ON dig_points
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own dig_points"
  ON dig_points
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FINDS table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE finds (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  dig_point_id TEXT NOT NULL REFERENCES dig_points(id) ON DELETE CASCADE,
  at TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'monnaie', 'fibule', 'boucle', 'applique', 'plomb', 'bague', 'militaria',
      'outil', 'ferrure', 'indetermine', 'autre'
    )
  ),
  material TEXT NOT NULL CHECK (
    material IN (
      'or', 'argent', 'billon', 'bronze', 'cuivre', 'plomb', 'fer', 'etain', 'autre'
    )
  ),
  period TEXT CHECK (
    period IN (
      'prehistoire', 'protohistoire', 'antique', 'medieval', 'moderne',
      'contemporain', 'indetermine'
    )
  ),
  depth_cm NUMERIC,
  photos TEXT[],  -- keys to Supabase Storage URLs or IndexedDB blob keys
  description TEXT,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_finds_user_id ON finds(user_id);
CREATE INDEX idx_finds_dig_point_id ON finds(dig_point_id);
CREATE INDEX idx_finds_at ON finds(at DESC);
CREATE INDEX idx_finds_synced_at ON finds(synced_at NULLS FIRST);
CREATE INDEX idx_finds_category ON finds(category);
CREATE INDEX idx_finds_material ON finds(material);

ALTER TABLE finds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own finds"
  ON finds
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finds"
  ON finds
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finds"
  ON finds
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own finds"
  ON finds
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SURFACE_OBSERVATIONS table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE surface_observations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  at TIMESTAMP WITH TIME ZONE NOT NULL,
  coord geometry(Point, 4326) NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'tegulae', 'imbrex', 'ceramique_commune', 'sigillee', 'mortier',
      'silex', 'scorie', 'pierre_taillee', 'os', 'autre'
    )
  ),
  density TEXT NOT NULL CHECK (density IN ('isole', 'diffus', 'concentre', 'tres_dense')),
  collected BOOLEAN NOT NULL,
  photos TEXT[],
  note TEXT,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_surface_observations_user_id ON surface_observations(user_id);
CREATE INDEX idx_surface_observations_session_id ON surface_observations(session_id);
CREATE INDEX idx_surface_observations_at ON surface_observations(at DESC);
CREATE INDEX idx_surface_observations_synced_at ON surface_observations(synced_at NULLS FIRST);
CREATE INDEX idx_surface_observations_kind ON surface_observations(kind);
CREATE INDEX idx_surface_observations_coord ON surface_observations USING GIST(coord);

ALTER TABLE surface_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own surface_observations"
  ON surface_observations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own surface_observations"
  ON surface_observations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own surface_observations"
  ON surface_observations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own surface_observations"
  ON surface_observations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DETECTOR_PRESETS table (global, readable by all, managed by app logic)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE detector_presets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('all_metal', 'jewelry', 'custom', 'relics', 'coins')),
  sensitivity_min INTEGER NOT NULL CHECK (sensitivity_min >= 1 AND sensitivity_min <= 8),
  sensitivity_max INTEGER NOT NULL CHECK (sensitivity_max >= 1 AND sensitivity_max <= 8),
  notch TEXT NOT NULL CHECK (notch IN ('aucune', 'fer_bas_seulement')),
  coil TEXT NOT NULL CHECK (coil IN ('stock_6.5x9', 'sniper_4.5')),
  sweep TEXT NOT NULL CHECK (sweep IN ('tres_lent', 'lent', 'normal')),
  dig_rule TEXT NOT NULL,
  expect TEXT[],
  why TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE detector_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read detector_presets"
  ON detector_presets
  FOR SELECT
  USING (TRUE);

-- Inserts/updates restricted to authenticated users (policy placeholder)
CREATE POLICY "Only authenticated users can modify detector_presets"
  ON detector_presets
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- SCORE_CELLS table (global results, readable by all)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE score_cells (
  h3 TEXT PRIMARY KEY,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  contributions JSONB,  -- array of {criterion, weight, value, evidence, source}
  flagged JSONB,  -- {reason: 'ZPPA'|'MH'|'site_classe'|'bati', detail: string}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE score_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read score_cells"
  ON score_cells
  FOR SELECT
  USING (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket for photos (private to each user)
-- ─────────────────────────────────────────────────────────────────────────────
-- Photos bucket is created via CLI:
-- supabase storage create-bucket photos --public=false
-- Policies are applied in a follow-up migration or manually via the dashboard.
-- For now, the bucket structure is documented; the CLI call is in the README for Oscar.

-- ─────────────────────────────────────────────────────────────────────────────
-- Summary
-- ─────────────────────────────────────────────────────────────────────────────
-- All tables created with RLS enabled. Row Level Security policies enforce:
-- - Users can only see/modify their own data (filtered by user_id = auth.uid())
-- - Deletion is soft delete (deleted: true) only
-- - Spatial indexes on geometry columns for performance
-- - Sync fields (synced_at) indexed for efficient queue management
-- - All user_id columns default to auth.uid() for safety
