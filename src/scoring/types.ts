// Scoring types — aligned with CONTRACTS.md

export interface Contribution {
  criterion: string;
  weight: number;
  value: number; // 0..1
  evidence: string;
  source?: string;
}

export interface ScoreCell {
  h3: string; // H3 cell index
  score: number; // 0..100
  contributions: Contribution[];
  flagged?: {
    reason: 'ZPPA' | 'MH' | 'site_classe' | 'bati';
    detail: string;
  };
}

export interface ScoringConfig {
  schema_version: string;
  date_locked: string;
  grid: {
    type: string;
    resolution: number;
  };
  criteria: Array<{
    id: string;
    label: string;
    rank: string;
    weight: number;
    source: {
      type: 'geojson' | 'vector' | 'raster';
      path: string;
      feature_filter?: Record<string, any>;
      exclude_ids?: string[];
      status: string;
    };
    rule: {
      kind: 'proximity' | 'corridor' | 'raster_threshold';
      buffer_m: number;
      degradation?: {
        type: 'linear';
        radius_m: number;
        falloff: number;
      };
      applies_as_multiplier?: boolean;
    };
    justification: string;
    evidence: string;
  }>;
  modulators: Record<string, any>;
  normalization: {
    method: string;
    raw_score_range: [number, number];
    output_range: [number, number];
  };
}

export interface TopoFeature {
  type: 'Feature';
  // Point : toponymes/lieux ponctuels (Cassini, état-major).
  // LineString/MultiLineString : entités linéaires (rivières, voies) — ex.
  // data/derived/hydro_streams.geojson, en attente de T3.1 (cf. scoring.json
  // critère `proximity_source`).
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.MultiLineString;
  properties: {
    name: string;
    rank: number;
    [key: string]: any;
  };
}

export interface TopoGeoJSON {
  type: 'FeatureCollection';
  features: TopoFeature[];
}

export interface Zone {
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}
