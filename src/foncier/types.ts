/**
 * Types pour la couche foncier — distingue accès public / privé sous
 * autorisation / exclu, pour savoir où prospecter sans empiéter sur une
 * propriété privée.
 *
 * Ne remplace jamais l'accord du propriétaire : indicatif, pas une
 * autorisation. Aucune source publique ne donne l'identité du propriétaire.
 */

export type FoncierKind = 'bati' | 'foret_publique' | 'prive_autorisation';

export interface FoncierProperties {
  kind: FoncierKind;
  section?: string;
  numero?: string;
  contenance?: number;
  source: string;
}

export interface FoncierFeature {
  type: 'Feature';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: FoncierProperties;
  id?: string;
}

export interface FoncierGeoJSON {
  type: 'FeatureCollection';
  features: FoncierFeature[];
}

export interface VoieProperties {
  nature: string | null;
  prive: boolean | null;
  acces_pieton: string | null;
  acces_vehicule_leger: string | null;
  nom: string | null;
  source: string;
}

export interface VoieFeature {
  type: 'Feature';
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  properties: VoieProperties;
  id?: string;
}

export interface VoiesGeoJSON {
  type: 'FeatureCollection';
  features: VoieFeature[];
}
