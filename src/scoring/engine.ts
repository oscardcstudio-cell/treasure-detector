/**
 * Scoring engine — interprets config/scoring.json and generates ScoreCell[] for H3 grid
 *
 * Pure function: no side effects, testable, no DOM.
 *
 * Flow:
 * 1. Load scoring.json, toponymes.geojson, zone.json
 * 2. For each criterion with status 'disponible':
 *    - Load features from GeoJSON
 *    - For each H3 cell in zone:
 *      - Apply criterion rule (proximity/corridor/raster)
 *      - Compute value (0..1) with distance degradation
 *      - Record contribution
 * 3. Sum contributions per cell, apply modulators
 * 4. Normalize [0, 250] → [0, 100]
 * 5. Return ScoreCell[]
 */

import { cellToBoundary, polygonToCells } from 'h3-js';
import { Contribution, ScoreCell, ScoringConfig, TopoGeoJSON, Zone } from './types';
import zoneConfig from '../../config/zone.json';

// Invariant projet : la zone vient de config/zone.json, jamais en dur dans src/
const ZONE_CENTER = zoneConfig.center as [number, number];

const EARTH_RADIUS_M = 6371000;

/**
 * Distance between two points in meters (WGS84)
 */
function distanceM(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Linear degradation: value = max(0, 1 - distance / radius) then multiply by falloff if beyond buffer
 */
function degrade(distM: number, bufferM: number, radiusM: number, falloff: number): number {
  if (distM <= bufferM) {
    return 1.0;
  }
  const beyond = distM - bufferM;
  const maxDegradation = radiusM - bufferM;
  if (maxDegradation <= 0) return 0;
  return Math.max(0, (1 - beyond / maxDegradation) * falloff);
}

/**
 * Get all H3 cells covering a bbox at given resolution
 * bbox format: [minLon, minLat, maxLon, maxLat]
 */
function getCellsForBbox(
  [minLon, minLat, maxLon, maxLat]: [number, number, number, number],
  resolution: number
): string[] {
  // polygonToCells pave RÉELLEMENT le polygone. L'échantillonnage manuel
  // précédent (pas de 0,01° ≈ 1,1 km, soit 17× la taille d'une cellule res 10)
  // ne touchait qu'une poignée de cellules isolées : pas de couverture, pas de
  // carte de chaleur. h3-js attend des sommets [lat, lng].
  const ring: Array<[number, number]> = [
    [minLat, minLon],
    [minLat, maxLon],
    [maxLat, maxLon],
    [maxLat, minLon],
  ];
  return polygonToCells([ring], resolution);
}

/**
 * Apply proximity rule: buffer around point with linear degradation
 */
function applyProximity(
  cellLat: number,
  cellLon: number,
  features: Array<{ geometry: { coordinates: [number, number] }; properties: any }>,
  bufferM: number,
  radiusM: number,
  falloff: number
): number {
  let maxValue = 0;

  for (const feature of features) {
    const [featureLon, featureLat] = feature.geometry.coordinates;
    const dist = distanceM(cellLon, cellLat, featureLon, featureLat);
    const value = degrade(dist, bufferM, radiusM, falloff);
    maxValue = Math.max(maxValue, value);
  }

  return maxValue;
}

/**
 * Apply corridor rule: buffer around a line (approximate via point expansion)
 * For now, treat as proximity to any feature point.
 * TODO: if linestring available, compute distance to line
 */
function applyCorridor(
  cellLat: number,
  cellLon: number,
  features: Array<{ geometry: { coordinates: [number, number] }; properties: any }>,
  bufferM: number,
  radiusM: number,
  falloff: number
): number {
  // Corridor is like proximity but with wider buffer
  return applyProximity(cellLat, cellLon, features, bufferM, radiusM, falloff);
}

/**
 * Filter features by GeoJSON property filter (simple exact match or presence)
 */
function filterFeatures(
  features: Array<{ geometry: any; properties: Record<string, any> }>,
  filter?: Record<string, any>,
  excludeIds?: string[]
): Array<{ geometry: any; properties: Record<string, any> }> {
  if (!filter) return features;

  return features.filter((f) => {
    const props = f.properties;

    // Check exclude list
    if (excludeIds && excludeIds.includes(props.name)) {
      return false;
    }

    for (const [key, expectedValue] of Object.entries(filter)) {
      if (typeof expectedValue === 'object' && expectedValue !== null) {
        // Handle special cases like $regex
        if ('$regex' in expectedValue) {
          const regex = new RegExp(expectedValue.$regex);
          if (!regex.test(props[key])) return false;
        }
      } else {
        if (props[key] !== expectedValue) return false;
      }
    }
    return true;
  });
}

/**
 * Get lon/lat center of an H3 cell using boundary midpoint
 */
function getCellCenter(h3Index: string): [number, number] {
  try {
    // Get cell boundary (array of [lat, lng] pairs from h3-js)
    const boundary = cellToBoundary(h3Index, false);

    if (boundary.length === 0) {
      return ZONE_CENTER; // Fallback to zone center [lon, lat]
    }

    // Compute center as average of boundary points
    // Note: h3-js uses [lat, lng] format
    let sumLat = 0;
    let sumLng = 0;
    for (const [lat, lng] of boundary) {
      sumLat += lat;
      sumLng += lng;
    }

    const centerLat = sumLat / boundary.length;
    const centerLng = sumLng / boundary.length;

    return [centerLng, centerLat]; // Return [lon, lat] for GeoJSON
  } catch {
    // Fallback if boundary computation fails
    return ZONE_CENTER;
  }
}

/**
 * Main scoring engine
 */
export async function scoreZone(
  config: ScoringConfig,
  topoGeoJSON: TopoGeoJSON,
  zone: Zone
): Promise<ScoreCell[]> {
  const resolution = config.grid.resolution;
  const cells = getCellsForBbox(zone.bbox, resolution);
  const results: ScoreCell[] = [];
  const normConfig = config.normalization;

  // Filter only 'disponible' criteria
  const activeCriteria = config.criteria.filter((c) => c.source.status === 'disponible');

  // Plafond de normalisation : ce qu'une cellule peut cumuler au mieux aujourd'hui
  const maxAttainableRaw = activeCriteria.reduce((sum, c) => sum + c.weight, 0);

  // Pre-process: group features by criterion
  const criteriaFeatures: Map<string, Array<any>> = new Map();
  for (const criterion of activeCriteria) {
    const filtered = filterFeatures(
      topoGeoJSON.features,
      criterion.source.feature_filter,
      criterion.source.exclude_ids
    );
    criteriaFeatures.set(criterion.id, filtered);
  }

  for (const cellH3 of cells) {
    const contributions: Contribution[] = [];

    // Get cell center (returns [lon, lat])
    const [cellLon, cellLat] = getCellCenter(cellH3);

    for (const criterion of activeCriteria) {
      const features = criteriaFeatures.get(criterion.id) || [];
      if (features.length === 0) continue;

      let value = 0;
      const rule = criterion.rule;

      if (rule.kind === 'proximity') {
        const buffer = rule.buffer_m;
        const radius = rule.degradation?.radius_m || buffer * 2;
        const falloff = rule.degradation?.falloff || 1.0;
        value = applyProximity(cellLat, cellLon, features, buffer, radius, falloff);
      } else if (rule.kind === 'corridor') {
        const buffer = rule.buffer_m;
        const radius = rule.degradation?.radius_m || buffer * 2;
        const falloff = rule.degradation?.falloff || 1.0;
        value = applyCorridor(cellLat, cellLon, features, buffer, radius, falloff);
      }

      if (value > 0) {
        const contribution: Contribution = {
          criterion: criterion.label,
          weight: criterion.weight,
          value,
          evidence: criterion.evidence,
          source: criterion.source.path,
        };
        contributions.push(contribution);
      }
    }

    // Sum contributions
    let cellRawScore = 0;
    for (const contrib of contributions) {
      cellRawScore += contrib.weight * contrib.value;
    }

    // Normalisation sur le MAXIMUM RÉELLEMENT ATTEIGNABLE (somme des poids des
    // critères actifs), pas sur le plafond fixe de 250 du JSON : avec 5 critères
    // actifs (total 111), diviser par 250 écrase tout sous 25/100 et rend la
    // carte de chaleur uniformément froide. Se recalibre seul quand T3.1 activera
    // les critères LiDAR en réserve.
    const [outMin, outMax] = normConfig.output_range;
    const cellScore = maxAttainableRaw > 0 ? (cellRawScore / maxAttainableRaw) * (outMax - outMin) + outMin : 0;
    const finalScore = Math.round(Math.min(outMax, Math.max(outMin, cellScore)));

    if (contributions.length > 0) {
      results.push({
        h3: cellH3,
        score: finalScore,
        contributions,
      });
    }
  }

  return results;
}

/**
 * Validate that all active criteria sources are readable
 */
export async function validateConfig(
  config: ScoringConfig,
  topoGeoJSON: TopoGeoJSON
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const activeCriteria = config.criteria.filter((c) => c.source.status === 'disponible');

  for (const criterion of activeCriteria) {
    if (criterion.source.type === 'geojson') {
      // In browser, we assume data is already loaded; in tests, check structure
      if (!topoGeoJSON.features) {
        errors.push(`${criterion.id}: GeoJSON missing features array`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check for double-counting: no H3 cell should receive same criterion twice
 */
export function validateNoDuplicates(results: ScoreCell[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const cell of results) {
    const criteriaNames = new Set<string>();
    for (const contrib of cell.contributions) {
      if (criteriaNames.has(contrib.criterion)) {
        errors.push(`Cell ${cell.h3}: criterion "${contrib.criterion}" appears twice`);
      }
      criteriaNames.add(contrib.criterion);
    }
  }

  return { valid: errors.length === 0, errors };
}
