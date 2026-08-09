export type TargetCategory = 'major' | 'forti' | 'voie' | 'habitat' | 'repere';

export interface TargetProperties {
  name: string;
  category: TargetCategory;
  period: string;
  find: string;
  justification: string;
}

export interface TargetFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: TargetProperties;
}

export interface TargetsGeoJSON {
  type: 'FeatureCollection';
  features: TargetFeature[];
}
