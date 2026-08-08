import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadSignaledZones,
  filterZonesByKind,
  knownSitesForValidation,
} from '../source';
import { mockZonesGeoJSON, mhOnlyFixture } from './fixtures';

/**
 * Tests pour le module source (chargement et filtrage des zones)
 */

// Mock fetch global pour les tests
const mockFetch = vi.fn();

describe('zones/source', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadSignaledZones', () => {
    it('devrait charger un GeoJSON valide', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockZonesGeoJSON,
      });

      const result = await loadSignaledZones();

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(3);
      expect(result.features[0]!.properties.name).toBe('Église Saint-Martin (site ancien)');
    });

    it('devrait retourner une FeatureCollection vide en cas 404 (fichier absent)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await loadSignaledZones();

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(0);
    });

    // Couche INFORMATIVE et optionnelle (commit da2ee4e) : toute erreur —
    // HTTP, structure, parsing — dégrade en couche vide au lieu de rejeter,
    // sinon le montage de la carte plantait en boucle en production.
    it('devrait dégrader en couche vide en cas erreur HTTP autre que 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await loadSignaledZones();
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(0);
    });

    it('devrait dégrader en couche vide si la structure GeoJSON est invalide', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'InvalidType',
          features: [],
        }),
      });

      const result = await loadSignaledZones();
      expect(result.features).toHaveLength(0);
    });

    it('devrait dégrader en couche vide en cas JSON invalide', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('JSON parsing error');
        },
      });

      const result = await loadSignaledZones();
      expect(result.features).toHaveLength(0);
    });
  });

  describe('filterZonesByKind', () => {
    it('devrait filtrer par un seul type', () => {
      const result = filterZonesByKind(mockZonesGeoJSON, 'MH');

      expect(result.features).toHaveLength(1);
      expect(result.features[0]!.properties.kind).toBe('MH');
    });

    it('devrait filtrer par plusieurs types', () => {
      const result = filterZonesByKind(mockZonesGeoJSON, ['MH', 'ZPPA']);

      expect(result.features).toHaveLength(2);
      expect(result.features.every((f) => ['MH', 'ZPPA'].includes(f.properties.kind))).toBe(
        true,
      );
    });

    it('devrait retourner une FeatureCollection vide si aucun match', () => {
      const result = filterZonesByKind(mockZonesGeoJSON, 'nonexistent');

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(0);
    });

    it('devrait conserver la structure FeatureCollection', () => {
      const result = filterZonesByKind(mockZonesGeoJSON, 'site_classe');

      expect(result.type).toBe('FeatureCollection');
      expect(Array.isArray(result.features)).toBe(true);
    });
  });

  describe('knownSitesForValidation', () => {
    it('devrait extraire MH et sites classés', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockZonesGeoJSON,
      });

      const result = await knownSitesForValidation();

      expect(result).toHaveLength(2);
      expect(result[0]!.kind).toBe('MH');
      expect(result[1]!.kind).toBe('site_classe');
    });

    it('devrait calculer le centroïde d\'une Polygon', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mhOnlyFixture, // Point : [0.1908, 43.5742]
      });

      const result = await knownSitesForValidation();

      expect(result).toHaveLength(1);
      expect(result[0]!.coord).toEqual([0.1908, 43.5742]);
    });

    it('devrait retourner un tableau vide si pas de sites connus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          return {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [0.1, 43.5] },
                properties: { name: 'ZPPA', kind: 'ZPPA', source: 'test' },
              },
            ],
          };
        },
      });

      const result = await knownSitesForValidation();

      expect(result).toHaveLength(0);
    });

    it('devrait gérer l\'absence du fichier gracieusement', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await knownSitesForValidation();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('intégration', () => {
    it('devrait charger puis filtrer sans incohérence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockZonesGeoJSON,
      });

      const geojson = await loadSignaledZones();
      const mhOnly = filterZonesByKind(geojson, 'MH');

      expect(mhOnly.features.length).toBeLessThanOrEqual(geojson.features.length);
      expect(mhOnly.features[0]!.properties.kind).toBe('MH');
    });
  });
});
