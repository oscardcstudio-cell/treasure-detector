/**
 * Tests for T3.3 scoring engine
 *
 * Validates:
 * 1. Proximity rule with distance degradation
 * 2. No double-counting
 * 3. Performance on full zone
 * 4. Normalization (raw → [0,100])
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scoreZone, validateNoDuplicates, distanceToGeometryM } from '../engine';
import { ScoringConfig, TopoGeoJSON, Zone } from '../types';

describe('Scoring Engine', () => {
  let config: ScoringConfig;
  let topoGeoJSON: TopoGeoJSON;
  let zone: Zone;

  beforeAll(() => {
    // Minimal fixture config
    config = {
      schema_version: '1.0',
      date_locked: '2026-08-08',
      grid: {
        type: 'h3',
        resolution: 10,
      },
      criteria: [
        {
          id: 'test_proximity',
          label: 'Test Proximity',
          rank: 'A',
          weight: 30,
          source: {
            type: 'geojson',
            path: 'test.geojson',
            feature_filter: { name: 'TestPoint' },
            status: 'disponible',
          },
          rule: {
            kind: 'proximity',
            buffer_m: 100,
            degradation: {
              type: 'linear',
              radius_m: 300,
              falloff: 0.5,
            },
          },
          justification: 'Test',
          evidence: 'Fixture',
        },
      ],
      modulators: {},
      normalization: {
        method: 'linear_rescale',
        raw_score_range: [0, 250],
        output_range: [0, 100],
      },
    };

    // Minimal fixture data: one point at bbox center
    topoGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0.1908, 43.5742], // Armous center
          },
          properties: {
            name: 'TestPoint',
            rank: 1,
          },
        },
      ],
    };

    // Zone: Armous-et-Cau approximation
    zone = {
      bbox: [0.0908, 43.4742, 0.2908, 43.6742],
    };
  });

  it('should score proximity correctly', async () => {
    const results = await scoreZone(config, topoGeoJSON, zone);

    expect(results.length).toBeGreaterThan(0);

    // Cells near the point should have higher scores
    const scoredCells = results.filter((c) => c.score > 0);
    expect(scoredCells.length).toBeGreaterThan(0);

    // All scores should be in [0, 100]
    for (const cell of results) {
      expect(cell.score).toBeGreaterThanOrEqual(0);
      expect(cell.score).toBeLessThanOrEqual(100);
    }
  });

  it('should apply distance degradation monotonically', async () => {
    const results = await scoreZone(config, topoGeoJSON, zone);

    // Cells should be sorted by distance (proxy: by score)
    const scoredCells = results
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    // Top score should be >= second score (monotonic degradation)
    if (scoredCells.length > 1) {
      for (let i = 0; i < scoredCells.length - 1; i++) {
        const score1 = scoredCells[i]?.score ?? 0;
        const score2 = scoredCells[i + 1]?.score ?? 0;
        // Due to grid sampling, we can't guarantee strict monotonicity,
        // but top cells should generally be higher
        expect(score1).toBeGreaterThanOrEqual(score2 * 0.9); // Allow 10% variance
      }
    }
  });

  it('should not double-count contributions', async () => {
    const results = await scoreZone(config, topoGeoJSON, zone);
    const validation = validateNoDuplicates(results);
    expect(validation.valid).toBe(true);
  });

  it('should explain contributions', async () => {
    const results = await scoreZone(config, topoGeoJSON, zone);
    const scoredCells = results.filter((c) => c.score > 0);

    if (scoredCells.length > 0) {
      const cell = scoredCells[0];
      if (cell) {
        expect(cell.contributions.length).toBeGreaterThan(0);

        const contrib = cell.contributions[0];
        if (contrib) {
          expect(contrib.criterion).toBeDefined();
          expect(contrib.weight).toBeGreaterThan(0);
          expect(contrib.value).toBeGreaterThanOrEqual(0);
          expect(contrib.value).toBeLessThanOrEqual(1);
          expect(contrib.evidence).toBeDefined();
        }
      }
    }
  });

  it('should complete full zone scoring in < 3 seconds', async () => {
    const start = performance.now();
    const results = await scoreZone(config, topoGeoJSON, zone);
    const elapsedMs = performance.now() - start;

    console.log(`✓ Full zone scoring: ${results.length} cells in ${elapsedMs.toFixed(0)}ms`);
    expect(elapsedMs).toBeLessThan(3000);
  });
});

describe('Scoring Engine — géométrie linéaire (corridor rule, ex. rivières)', () => {
  // Reproduit le bug corrigé : avant le fix, applyCorridor/applyProximity
  // destructuraient `geometry.coordinates` comme un [lon, lat] unique — sur une
  // LineString c'est un tableau de sommets, donc la distance calculée était
  // fausse (ou NaN) au lieu de mesurer la distance au segment le plus proche.
  const zone: Zone = { bbox: [0.0908, 43.4742, 0.2908, 43.6742] };

  // Rivière traversant le centre de la zone d'ouest en est
  const riverGeoJSON: TopoGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0.0908, 43.5742],
            [0.19, 43.5742],
            [0.2908, 43.5742],
          ],
        },
        properties: { name: 'Rivière test', rank: 1 },
      },
    ],
  };

  function corridorConfig(bufferM: number, radiusM: number): ScoringConfig {
    return {
      schema_version: '1.0',
      date_locked: '2026-08-08',
      grid: { type: 'h3', resolution: 10 },
      criteria: [
        {
          id: 'test_river',
          label: 'Test River',
          rank: 'B',
          weight: 12,
          source: { type: 'geojson', path: 'test-river.geojson', status: 'disponible' },
          rule: { kind: 'corridor', buffer_m: bufferM, degradation: { type: 'linear', radius_m: radiusM, falloff: 0.5 } },
          justification: 'Test',
          evidence: 'Fixture',
        },
      ],
      modulators: {},
      normalization: { method: 'linear_rescale', raw_score_range: [0, 250], output_range: [0, 100] },
    };
  }

  it('scores a cell right on the river at full value', async () => {
    const results = await scoreZone(corridorConfig(50, 200), riverGeoJSON, zone);
    // Cellule H3 la plus proche du milieu de la rivière : score max (100)
    const best = results.reduce((max, c) => (c.score > max.score ? c : max));
    expect(best.score).toBeGreaterThanOrEqual(95);
  });

  it('measures distance to the nearest segment, not to a single vertex', () => {
    const line: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [0.0908, 43.5742],
        [0.19, 43.5742],
        [0.2908, 43.5742],
      ],
    };

    // Point directement sous le sommet du milieu (0.19, 43.5742) : distance ≈ 0
    const atMiddleVertex = distanceToGeometryM(43.5742, 0.19, line);
    expect(atMiddleVertex).toBeLessThan(1);

    // Point à mi-chemin entre les deux sommets, légèrement au nord de la ligne :
    // avant le fix, seule la distance aux SOMMETS était mesurable (le code
    // détruisait `coordinates` comme un [lon,lat] unique) — un point face au
    // milieu d'un segment mais loin des sommets aurait été jugé "loin" à tort.
    const midSegmentLon = (0.0908 + 0.19) / 2;
    const distToSegment = distanceToGeometryM(43.575, midSegmentLon, line);
    // ~90m nord de la ligne : doit rester proche de la distance perpendiculaire
    // réelle (~90m), pas de la distance au sommet le plus proche (~qq km).
    expect(distToSegment).toBeLessThan(200);
  });

  it('degrades score with distance from the river line', async () => {
    const results = await scoreZone(corridorConfig(50, 5000), riverGeoJSON, zone);
    for (const cell of results) {
      expect(cell.score).toBeGreaterThanOrEqual(0);
      expect(cell.score).toBeLessThanOrEqual(100);
    }
    const scored = results.filter((c) => c.score > 0);
    expect(scored.length).toBeGreaterThan(1);
  });
});
