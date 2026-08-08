/**
 * Types pour zones signalées — zones non prospectables ou à autorisation
 * (monuments historiques, ZPPA, périmètres de protection).
 *
 * Rôle dans le scoring : drapeau avertissement avant creusage, jamais bloquant.
 */

export type ZoneKind = 'MH' | 'perimetre' | 'ZPPA' | 'site_classe' | 'autre';

export interface SignaledZoneProperties {
  name: string;
  kind: ZoneKind;
  source: string;
  ref?: string; // référence BDD (Mérimée, etc.)
  description?: string;
}

export interface SignaledZone {
  type: 'Feature';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.Point;
  properties: SignaledZoneProperties;
  id?: string;
}

export interface SignaledZonesGeoJSON {
  type: 'FeatureCollection';
  features: SignaledZone[];
  crs?: {
    type: 'name';
    properties: { name: string };
  };
}

export interface ZonesLayerState {
  isLoaded: boolean;
  isVisible: boolean;
  features: SignaledZone[];
  error?: string;
}
