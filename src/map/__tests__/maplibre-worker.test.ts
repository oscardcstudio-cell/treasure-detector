/**
 * Garde-fou : le worker MapLibre doit rester câblé explicitement.
 *
 * Sans ce câblage, MapLibre v6 cherche son worker à une URL qui n'existe pas
 * dans le build Vite. Le worker meurt en silence : les fonds de carte raster
 * continuent de s'afficher, mais AUCUNE source GeoJSON ne charge — carte de
 * chaleur du scoring, zones signalées, traces GPS restent invisibles, sans
 * la moindre erreur en console.
 *
 * C'est exactement le bug qui a fait croire que « Score Zone » ne servait à
 * rien : le calcul tournait, les hexagones n'arrivaient jamais à l'écran.
 * Ces trois assertions sont bon marché et couvrent les trois façons de le
 * casser à nouveau.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

describe('câblage du worker MapLibre', () => {
  it('src/map/maplibreWorker.ts impose l’URL du worker émis par Vite', () => {
    const source = read('src/map/maplibreWorker.ts');
    expect(source).toContain('setWorkerUrl');
    expect(source).toContain('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url');
  });

  it('main.tsx importe le câblage avant de monter l’app', () => {
    const main = read('src/main.tsx');
    expect(main).toContain("import './map/maplibreWorker'");
    expect(main.indexOf("import './map/maplibreWorker'")).toBeLessThan(main.indexOf("from './App'"));
  });

  it('vite.config.ts émet les workers en ES module', () => {
    // MapLibre instancie le worker avec { type: 'module' } : en 'iife' il se
    // charge puis échoue au premier import, avec le même silence.
    const config = read('vite.config.ts');
    expect(config).toMatch(/worker:\s*\{[^}]*format:\s*'es'/s);
  });
});
