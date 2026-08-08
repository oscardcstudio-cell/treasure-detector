/**
 * Heat map generation: ScoreCell[] → GeoJSON FeatureCollection of hexagons
 *
 * Converts H3 cell indices to hexagon polygons with score properties.
 * Output ready for MapLibre fill layer.
 */

import { cellToBoundary } from 'h3-js';
import { ScoreCell } from './types';

export interface HexFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: Array<[number, number][]>;
  };
  properties: {
    h3: string;
    score: number;
    color: string;
  };
}

/**
 * Score to color (0–100 → gradient from blue to red)
 *
 * 0–25: blue (cold)
 * 25–50: cyan (cool)
 * 50–75: yellow (warm)
 * 75–100: red (hot)
 */
export function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(100, score)); // Clamp to [0, 100]

  if (s < 25) {
    // Blue to cyan
    const t = s / 25;
    const r = Math.floor(0 + (0 - 0) * t);
    const g = Math.floor(100 + (255 - 100) * t);
    const b = Math.floor(200 + (255 - 200) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (s < 50) {
    // Cyan to yellow
    const t = (s - 25) / 25;
    const r = Math.floor(0 + (255 - 0) * t);
    const g = Math.floor(255 + (255 - 255) * t);
    const b = Math.floor(255 + (0 - 255) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (s < 75) {
    // Yellow to orange
    const t = (s - 50) / 25;
    const r = Math.floor(255);
    const g = Math.floor(255 + (165 - 255) * t);
    const b = Math.floor(0);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Orange to red
    const t = (s - 75) / 25;
    const r = Math.floor(255);
    const g = Math.floor(165 + (0 - 165) * t);
    const b = Math.floor(0);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Convert H3 index to GeoJSON polygon coordinates (lon, lat)
 */
function h3ToPolygon(h3Index: string): [number, number][] {
  const boundary = cellToBoundary(h3Index, false);
  // cellToBoundary returns [lat, lng] pairs; convert to [lon, lat] for GeoJSON
  const coords: [number, number][] = [];
  for (const [lat, lng] of boundary) {
    coords.push([lng, lat]);
  }
  if (coords.length > 0 && coords[0]) {
    coords.push(coords[0]); // Close the ring
  }
  return coords;
}

/**
 * Generate heat map GeoJSON from ScoreCell array
 */
export function generateHeatMap(cells: ScoreCell[]): any {
  const features: HexFeature[] = cells.map((cell) => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [h3ToPolygon(cell.h3)],
    },
    properties: {
      h3: cell.h3,
      score: cell.score,
      color: scoreToColor(cell.score),
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * MapLibre paint spec for heat map (fill layer)
 */
export function getHeatMapPaintSpec(): any {
  return {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.7,
    'fill-outline-color': '#000',
  };
}
