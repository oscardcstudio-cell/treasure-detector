import { describe, it, expect, vi } from 'vitest';

/**
 * Garde-fous des couches relief LiDAR (T3.1) :
 * - registre cohérent (ids, URLs de release bien formées)
 * - protocole pmtiles:// enregistré via la lib officielle, une seule fois
 */

vi.mock('maplibre-gl', () => ({
  addProtocol: vi.fn(),
  Map: class {},
}));

import { addProtocol } from 'maplibre-gl';
import { LIDAR_LAYERS, LIDAR_LAYER_IDS } from '../layers';
import { initPMTilesProtocol, createPMTilesSource } from '../../geo/pmtiles';

describe('LIDAR_LAYERS registry', () => {
  it('expose les 4 dérivés attendus', () => {
    expect(LIDAR_LAYER_IDS.sort()).toEqual(
      ['lidar-hillshade', 'lidar-lrm', 'lidar-openness', 'lidar-svf']);
  });

  it('chaque couche a un id cohérent et une URL pmtiles same-origin', () => {
    // Same-origin obligatoire : les assets GitHub Releases refusent le CORS
    // navigateur (vérifié 2026-08-10) — une URL github.com ici = couche morte.
    for (const [key, def] of Object.entries(LIDAR_LAYERS)) {
      expect(def.id).toBe(key);
      expect(def.pmtilesUrl).toMatch(/^\/data\/derived\/.+\.pmtiles$/);
      expect(def.attribution).toContain('IGN');
    }
  });
});

describe('protocole PMTiles', () => {
  it('createPMTilesSource préfixe pmtiles:// et cible une source raster', () => {
    const src = createPMTilesSource('https://example.com/hillshade.pmtiles');
    expect(src).toEqual({
      type: 'raster',
      url: 'pmtiles://https://example.com/hillshade.pmtiles',
      tileSize: 256,
    });
  });

  it("initPMTilesProtocol n'enregistre le protocole qu'une seule fois", () => {
    initPMTilesProtocol();
    initPMTilesProtocol();
    expect(vi.mocked(addProtocol)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(addProtocol)).toHaveBeenCalledWith('pmtiles', expect.any(Function));
  });
});
