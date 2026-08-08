/**
 * Garde-fou : MapView doit observer lui-même la taille de son conteneur.
 *
 * Bug d'origine (prod, 2026-08-08) : au chargement à froid, la carte naissait
 * dans un conteneur pas encore mesuré → canvas de secours MapLibre 400×300,
 * carte tronquée en haut à gauche. MapLibre avale volontairement le premier
 * événement de son propre ResizeObserver (le seul portant la vraie taille),
 * donc il ne se rattrape jamais si le conteneur ne bouge plus ensuite.
 *
 * Le fix : un ResizeObserver à nous dans MapView, qui reçoit l'événement
 * initial et appelle map.resize(). Ces assertions vérifient que ce câblage
 * reste en place.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../MapView.tsx'), 'utf-8');

describe('MapView — recalage de la taille du canvas', () => {
  it('pose son propre ResizeObserver sur le conteneur', () => {
    expect(source).toContain('new ResizeObserver(() => instance.resize())');
    expect(source).toContain('resizeObserver.observe(mapContainer.current)');
  });

  it('le déconnecte au démontage', () => {
    expect(source).toContain('resizeObserver?.disconnect()');
  });
});
