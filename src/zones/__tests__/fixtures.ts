import type { SignaledZonesGeoJSON } from '../types';

/**
 * Fixture : zones signalées de test pour Armous-et-Cau
 * (Données fictives, structures valides uniquement pour les tests)
 */
export const mockZonesGeoJSON: SignaledZonesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'mh-001',
      geometry: {
        type: 'Point',
        coordinates: [0.1908, 43.5742],
      },
      properties: {
        name: 'Église Saint-Martin (site ancien)',
        kind: 'MH',
        source: 'Atlas des patrimoines (test)',
        ref: 'PA32000001',
        description: 'Site probable de fusion 1790-1794',
      },
    },
    {
      type: 'Feature',
      id: 'zppa-001',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0.15, 43.55],
            [0.16, 43.55],
            [0.16, 43.56],
            [0.15, 43.56],
            [0.15, 43.55],
          ],
        ],
      },
      properties: {
        name: 'ZPPA Armous-village',
        kind: 'ZPPA',
        source: 'Atlas des patrimoines (test)',
        ref: 'ZPPA-32-001',
      },
    },
    {
      type: 'Feature',
      id: 'site-classe-001',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0.18, 43.56],
            [0.20, 43.56],
            [0.20, 43.58],
            [0.18, 43.58],
            [0.18, 43.56],
          ],
        ],
      },
      properties: {
        name: 'Site classé — Vallée du Midour',
        kind: 'site_classe',
        source: 'Atlas des patrimoines (test)',
      },
    },
  ],
};

/**
 * GeoJSON vide pour tester le cas d'absence
 */
export const emptyZonesGeoJSON: SignaledZonesGeoJSON = {
  type: 'FeatureCollection',
  features: [],
};

/**
 * GeoJSON avec un seul MH pour tester le filtrage
 */
export const mhOnlyFixture: SignaledZonesGeoJSON = {
  type: 'FeatureCollection',
  features: [mockZonesGeoJSON.features[0]!],
};
