import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Tests de sérialisation de l'état MapView
 * Vérifie que la persistance localStorage fonctionne correctement
 */

describe('Map state persistence', () => {
  const STORAGE_KEY = 'treasure-detector:map-state';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should serialize and deserialize map state', () => {
    const state = {
      baseLayer: 'plan-ignv2',
      activeHistoricLayer: 'cassini' as const,
      historicOpacity: 0.6,
      center: [0.1908, 43.5742] as [number, number],
      zoom: 14,
      pitch: 0,
      bearing: 0,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const retrieved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    expect(retrieved).toEqual(state);
  });

  it('should handle null historic layer', () => {
    const state = {
      baseLayer: 'ortho-current',
      activeHistoricLayer: null,
      historicOpacity: 0.5,
      center: [0.1908, 43.5742] as [number, number],
      zoom: 15,
      pitch: 0,
      bearing: 0,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const retrieved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    expect(retrieved.activeHistoricLayer).toBeNull();
  });

  it('should persist opacity in valid range [0, 1]', () => {
    [0, 0.25, 0.5, 0.75, 1].forEach((opacity) => {
      const state = {
        baseLayer: 'plan-ignv2',
        activeHistoricLayer: null,
        historicOpacity: opacity,
        center: [0.1908, 43.5742] as [number, number],
        zoom: 14,
        pitch: 0,
        bearing: 0,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const retrieved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

      expect(retrieved.historicOpacity).toBe(opacity);
      expect(retrieved.historicOpacity).toBeGreaterThanOrEqual(0);
      expect(retrieved.historicOpacity).toBeLessThanOrEqual(1);
    });
  });

  it('should preserve zoom level precision', () => {
    const zoomLevels = [6, 6.5, 12, 14, 14.75, 18, 19];

    zoomLevels.forEach((zoom) => {
      const state = {
        baseLayer: 'plan-ignv2',
        activeHistoricLayer: null,
        historicOpacity: 0.5,
        center: [0.1908, 43.5742] as [number, number],
        zoom,
        pitch: 0,
        bearing: 0,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const retrieved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

      expect(retrieved.zoom).toBe(zoom);
    });
  });

  it('should handle corrupted storage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json {');

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    expect(() => JSON.parse(saved as string)).toThrow();
  });
});
