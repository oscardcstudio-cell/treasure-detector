/**
 * Garde-fou : « Score Zone » doit marcher dès le PREMIER clic, même si la
 * carte n'a pas fini de charger son style.
 *
 * Bug d'origine (prod, 2026-08-08) : un clic juste après l'ouverture de la
 * page affichait « Style is not done loading » sous le bouton ; le second
 * clic passait. Cause : seul addSource était protégé par le retry — les
 * addLayer juste derrière faisaient le même contrôle interne de MapLibre,
 * hors protection. Le fix exécute TOUTES les mutations dans un seul bloc,
 * déclenché quand `map.getStyle()` devient truthy (l'invariant exact que
 * MapLibre v6 teste avant d'accepter une mutation).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../index', () => ({
  scoreZone: vi.fn(async () => [
    { h3: '8a1fb46622dffff', score: 0.8, contributions: [] },
  ]),
  generateHeatMap: vi.fn(() => ({ type: 'FeatureCollection', features: [] })),
  getHeatMapPaintSpec: vi.fn(() => ({ 'fill-color': '#000' })),
  WhyPanel: () => null,
}));

import { ScoringLayer } from '../ScoringLayer';

/** Simule la sémantique MapLibre v6 : mutations refusées tant que le style
 *  n'est pas chargé, `getStyle()` undefined dans le même intervalle,
 *  `styledata` émis au chargement. */
function createFakeMap() {
  const sources: Record<string, { setData: () => void }> = {};
  const layers: Record<string, unknown> = {};
  const listeners: Record<string, Array<() => void>> = {};
  let styleLoaded = false;

  const map = {
    getStyle: () => (styleLoaded ? { version: 8 } : undefined),
    addSource: (id: string) => {
      if (!styleLoaded) throw new Error('Style is not done loading.');
      sources[id] = { setData: vi.fn() };
    },
    getSource: (id: string) => sources[id],
    addLayer: (def: { id: string }) => {
      if (!styleLoaded) throw new Error('Style is not done loading.');
      layers[def.id] = def;
    },
    getLayer: (id: string) => layers[id],
    on: (type: string, ...rest: unknown[]) => {
      // les handlers ciblés sur une couche (3 arguments) ne nous servent pas ici
      if (rest.length === 2) return;
      (listeners[type] ??= []).push(rest[0] as () => void);
    },
    off: (type: string, cb: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== cb);
    },
    getCanvas: () => ({ style: {} as CSSStyleDeclaration }),
    loadStyle: () => {
      styleLoaded = true;
      for (const cb of [...(listeners['styledata'] ?? [])]) cb();
    },
    layers,
  };
  return map;
}

const renderLayer = (map: ReturnType<typeof createFakeMap>) =>
  render(
    <ScoringLayer
      map={map as never}
      zoneConfig={{}}
      scoringConfig={{} as never}
      topoGeoJSON={{}}
    />
  );

describe('ScoringLayer — premier clic avant chargement du style', () => {
  it('le scoring aboutit sans erreur une fois le style prêt', async () => {
    const map = createFakeMap();
    renderLayer(map);

    fireEvent.click(screen.getByText('Score Zone'));

    // Le calcul est lancé mais les mutations attendent le style
    await waitFor(() => expect(screen.queryByText(/style is not done/i)).toBeNull());
    expect(map.layers['heatmap-fill']).toBeUndefined();

    map.loadStyle();

    await waitFor(() => expect(screen.getByText('✓ Scoré')).toBeTruthy());
    expect(map.layers['heatmap-fill']).toBeDefined();
    expect(map.layers['heatmap-outline']).toBeDefined();
    expect(screen.queryByText(/style is not done/i)).toBeNull();
  });

  it('style déjà prêt : le clic score immédiatement (chemin nominal)', async () => {
    const map = createFakeMap();
    map.loadStyle();
    renderLayer(map);

    fireEvent.click(screen.getByText('Score Zone'));

    await waitFor(() => expect(screen.getByText('✓ Scoré')).toBeTruthy());
    expect(map.layers['heatmap-fill']).toBeDefined();
  });
});
