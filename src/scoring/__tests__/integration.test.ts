/**
 * Integration test: Real config + data
 *
 * Loads config/scoring.json and data/derived/toponymes.geojson
 * Validates against real zone
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scoreZone, validateConfig, validateNoDuplicates } from '../engine';
import { ScoringConfig, Zone } from '../types';
import { resolvePreset } from '../../presets/resolve';
import * as fs from 'fs';
import * as path from 'path';

describe('Scoring Integration — Real Data', () => {
  let config: ScoringConfig;
  let topoGeoJSON: any;
  let zone: Zone;

  beforeAll(() => {
    // Load real config
    const configPath = path.resolve(
      __dirname,
      '../../..',
      'config/scoring.json'
    );
    const configContent = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent) as ScoringConfig;

    // Load real data
    const topoPath = path.resolve(
      __dirname,
      '../../..',
      'data/derived/toponymes.geojson'
    );
    const topoContent = fs.readFileSync(topoPath, 'utf-8');
    topoGeoJSON = JSON.parse(topoContent);

    // Load real zone
    const zonePath = path.resolve(__dirname, '../../..', 'config/zone.json');
    const zoneContent = fs.readFileSync(zonePath, 'utf-8');
    zone = JSON.parse(zoneContent);
  });

  it('should load real config without errors', () => {
    expect(config.schema_version).toBeDefined();
    expect(config.criteria.length).toBeGreaterThan(0);

    const activeCriteria = config.criteria.filter(
      (c) => c.source.status === 'disponible' || c.source.status?.includes('disponible')
    );
    console.log(`Active criteria: ${activeCriteria.length} / ${config.criteria.length}`);
    // Some criteria are conditional (awaits_cadastral_confirmation, disponible_but_location_imprecise)
    expect(activeCriteria.length).toBeGreaterThanOrEqual(5);
  });

  it('should load topology data', () => {
    expect(topoGeoJSON.type).toBe('FeatureCollection');
    expect(topoGeoJSON.features.length).toBeGreaterThan(0);
    console.log(`Toponymy features: ${topoGeoJSON.features.length}`);
  });

  it('should validate config against data', async () => {
    const validation = await validateConfig(config, topoGeoJSON);
    expect(validation.valid).toBe(true);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
    }
  });

  it('should score real zone', async () => {
    const start = performance.now();
    const results = await scoreZone(config, topoGeoJSON, zone);
    const elapsedMs = performance.now() - start;

    console.log(`✓ Real zone scoring: ${results.length} cells in ${elapsedMs.toFixed(0)}ms`);
    expect(results.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(3000);

    // Check some scoring properties
    const scoredCells = results.filter((c) => c.score > 0);
    console.log(`Scored cells (score > 0): ${scoredCells.length} / ${results.length}`);
    expect(scoredCells.length).toBeGreaterThan(0);

    // All scores should be in [0, 100]
    for (const cell of results) {
      expect(cell.score).toBeGreaterThanOrEqual(0);
      expect(cell.score).toBeLessThanOrEqual(100);
    }

    // Top cell should have decent score
    const topCell = scoredCells.sort((a, b) => b.score - a.score)[0];
    if (topCell) {
      console.log(`Top score: ${topCell.score.toFixed(1)}/100`);
      console.log(`Contributions: ${topCell.contributions.map((c) => `${c.criterion}(${(c.weight * c.value).toFixed(1)})`).join(', ')}`);
      expect(topCell.score).toBeGreaterThan(10);
    }
  });

  it('should not double-count in real scoring', async () => {
    const results = await scoreZone(config, topoGeoJSON, zone);
    const validation = validateNoDuplicates(results);
    expect(validation.valid).toBe(true);
    if (!validation.valid) {
      console.error('Double-count errors:', validation.errors);
    }
  });

  it('should resolve a real, non-fallback preset for the top scored cell (regression: criterionId lookup)', async () => {
    // scoreZone().contributions[].criterion est un LIBELLÉ humain (ex. "Zone
    // source du Midour — Hountan"), pas une clé de config/presets.json
    // .criterionToPreset (clé = id, ex. "midour_source"). resolvePreset avait
    // longtemps cherché la mauvaise clé et retombait toujours sur le preset de
    // repli (labour_frais), quelle que soit la cellule réelle — jamais détecté
    // car PresetOverlay n'était mounté nulle part dans l'app. Ce test tourne
    // sur les vraies données (pas un fixture qui masque le bug par coïncidence).
    const results = await scoreZone(config, topoGeoJSON, zone);
    const scoredCells = results.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
    expect(scoredCells.length).toBeGreaterThan(0);

    const topCell = scoredCells[0]!;
    const resolution = resolvePreset(topCell);

    expect(resolution.why).not.toContain('non mappé');
    expect(resolution.preset.id).not.toBe('labour_frais');
  });

  it('should provide evidence for all contributions', async () => {
    const results = await scoreZone(config, topoGeoJSON, zone);
    const scoredCells = results.filter((c) => c.contributions.length > 0);

    for (const cell of scoredCells.slice(0, 5)) {
      // Check first 5 cells
      for (const contrib of cell.contributions) {
        expect(contrib.criterion).toBeTruthy();
        expect(contrib.weight).toBeGreaterThan(0);
        expect(contrib.value).toBeGreaterThanOrEqual(0);
        expect(contrib.value).toBeLessThanOrEqual(1);
        expect(contrib.evidence).toBeTruthy();
      }
    }
  });
});
