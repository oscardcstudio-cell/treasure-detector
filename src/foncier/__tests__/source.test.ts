import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadFoncier, loadVoies } from '../source';

const mockFoncierGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
      properties: { kind: 'bati', section: 'A', numero: '12', source: 'test' },
    },
  ],
};

const mockVoiesGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] },
      properties: { nature: 'Chemin', prive: false, acces_pieton: null, acces_vehicule_leger: null, nom: null, source: 'test' },
    },
  ],
};

const mockFetch = vi.fn();

describe('foncier/source', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadFoncier', () => {
    it('devrait charger un GeoJSON valide', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockFoncierGeoJSON });

      const result = await loadFoncier();

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
      expect(result.features[0]!.properties.kind).toBe('bati');
    });

    it('devrait retourner une FeatureCollection vide en cas 404 (pipeline pas encore lancé)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

      const result = await loadFoncier();

      expect(result.features).toHaveLength(0);
    });

    it('devrait dégrader en couche vide si la structure GeoJSON est invalide', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ type: 'InvalidType' }) });

      const result = await loadFoncier();

      expect(result.features).toHaveLength(0);
    });
  });

  describe('loadVoies', () => {
    it('devrait charger un GeoJSON valide', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockVoiesGeoJSON });

      const result = await loadVoies();

      expect(result.features).toHaveLength(1);
      expect(result.features[0]!.properties.prive).toBe(false);
    });

    it('devrait retourner une FeatureCollection vide en cas 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

      const result = await loadVoies();

      expect(result.features).toHaveLength(0);
    });
  });
});
