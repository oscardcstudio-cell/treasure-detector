import { describe, it, expect } from 'vitest';
import { LAYERS, BASEMAP_DEFAULTS, HISTORIC_LAYERS, DERIVED_LAYERS, type LayerDef } from '../layers';

describe('src/map/layers.ts', () => {
  describe('Layer registry', () => {
    it('should export all required base layers', () => {
      const planIgnV2 = LAYERS['plan-ignv2'];
      expect(planIgnV2).toBeDefined();
      const orthoCurrent = LAYERS['ortho-current'];
      expect(orthoCurrent).toBeDefined();
    });

    it('should export all historic layers', () => {
      const cassini = LAYERS['cassini'];
      expect(cassini).toBeDefined();
      const etatMajor = LAYERS['etat-major'];
      expect(etatMajor).toBeDefined();
      const ortho1950 = LAYERS['ortho-1950-65'];
      expect(ortho1950).toBeDefined();
      const orthoIrc = LAYERS['ortho-irc'];
      expect(orthoIrc).toBeDefined();
    });

    it('should have valid layer definitions', () => {
      Object.values(LAYERS).forEach((layer: LayerDef) => {
        expect(layer.id).toBeTruthy();
        expect(layer.label).toBeTruthy();
        expect(layer.url).toBeTruthy();
        expect(['image/png', 'image/jpeg']).toContain(layer.format);
        expect(layer.minZoom).toBeGreaterThanOrEqual(0);
        expect(layer.maxNativeZoom).toBeGreaterThanOrEqual(layer.minZoom);
        expect(layer.attribution).toBeTruthy();
        expect(['basemap', 'historic', 'derived']).toContain(layer.category);
      });
    });

    it('should have WMTS URLs properly formatted', () => {
      Object.values(LAYERS).forEach((layer) => {
        expect(layer.url).toMatch(/https:\/\/data\.geopf\.fr\/wmts\?/);
        expect(layer.url).toContain('{z}');
        expect(layer.url).toContain('{x}');
        expect(layer.url).toContain('{y}');
      });
    });

    it('should enforce maxNativeZoom limits', () => {
      // Cassini plafonne à z14 (spike confirmé)
      const cassini = LAYERS['cassini'];
      expect(cassini).toBeDefined();
      if (cassini) {
        expect(cassini.maxNativeZoom).toBeLessThanOrEqual(14);
      }
      // État-major plafonne à z15
      const etatMajor = LAYERS['etat-major'];
      expect(etatMajor).toBeDefined();
      if (etatMajor) {
        expect(etatMajor.maxNativeZoom).toBeLessThanOrEqual(15);
      }
    });

    it('ortho-1950-65 should use image/png format', () => {
      // FINDINGS.md: format image/png OBLIGATOIRE (jpeg renvoie 400)
      const ortho1950 = LAYERS['ortho-1950-65'];
      expect(ortho1950).toBeDefined();
      if (ortho1950) {
        expect(ortho1950.format).toBe('image/png');
      }
    });
  });

  describe('Basemap defaults', () => {
    it('should have default and options', () => {
      expect(BASEMAP_DEFAULTS.default).toBeTruthy();
      expect(BASEMAP_DEFAULTS.options.length).toBeGreaterThan(0);
    });

    it('default should be in options', () => {
      expect(BASEMAP_DEFAULTS.options).toContain(BASEMAP_DEFAULTS.default);
    });
  });

  describe('Layer categories', () => {
    it('should have at least one historic layer', () => {
      expect(HISTORIC_LAYERS.length).toBeGreaterThan(0);
    });

    it('all historic layers should exist in LAYERS', () => {
      HISTORIC_LAYERS.forEach((layerId) => {
        expect(LAYERS[layerId]).toBeDefined();
      });
    });

    it('all derived layers should exist in LAYERS', () => {
      DERIVED_LAYERS.forEach((layerId) => {
        expect(LAYERS[layerId]).toBeDefined();
      });
    });
  });

  describe('Express layers', () => {
    it('should provide 2024, 2025, 2026 IRC orthos', () => {
      expect(LAYERS['ortho-irc-2024']).toBeDefined();
      expect(LAYERS['ortho-irc-2025']).toBeDefined();
      expect(LAYERS['ortho-irc-2026']).toBeDefined();
    });

    it('should provide 2025, 2026 RVB-EXPRESS orthos', () => {
      expect(LAYERS['ortho-rvb-2025']).toBeDefined();
      expect(LAYERS['ortho-rvb-2026']).toBeDefined();
    });
  });
});
