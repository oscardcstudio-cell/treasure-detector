/**
 * Guidance to target: bearing and distance to a chosen point.
 * Used to navigate to a hot cell, a previous find, or a named target from CIBLES.md.
 */

import * as turf from '@turf/turf';
import { LonLat } from '../db/types';

export interface GuidanceData {
  targetName?: string; // e.g. "Cellule chaude, noyau d'Armous"
  targetCoord: LonLat; // WGS84 [lon, lat]
  currentPosition: LonLat; // WGS84 [lon, lat]
  distanceM: number;
  bearingDegrees: number; // 0-360, true north
  isReached: boolean; // within some threshold
  reachThresholdM?: number; // default 20 m
}

export class TargetGuidance {
  /**
   * Compute guidance data from user position to target.
   */
  static compute(
    currentPosition: LonLat,
    targetCoord: LonLat,
    targetName?: string,
    reachThresholdM: number = 20
  ): GuidanceData {
    const from = turf.point(currentPosition);
    const to = turf.point(targetCoord);

    const distanceM = turf.distance(from, to, { units: 'meters' });
    const bearing = turf.bearing(from, to);

    // Normalize bearing to 0-360
    const bearingDegrees = (bearing + 360) % 360;

    const isReached = distanceM < reachThresholdM;

    return {
      targetName,
      targetCoord,
      currentPosition,
      distanceM,
      bearingDegrees,
      isReached,
      reachThresholdM,
    };
  }

  /**
   * Format guidance as human-readable text.
   * Used in UI: "Cellule chaude: 143° (SSE), 127 m"
   */
  static format(guidance: GuidanceData): string {
    const direction = bearingToCompass(guidance.bearingDegrees);
    const distance = guidance.distanceM.toFixed(0);
    const bearing = guidance.bearingDegrees.toFixed(0);

    const targetLabel = guidance.targetName ?? 'Cible';
    return `${targetLabel}: ${bearing}° (${direction}), ${distance} m`;
  }
}

/**
 * Convert bearing (0-360°, true north) to cardinal/intercardinal direction.
 * e.g. 0 → "N", 45 → "NE", 90 → "E", etc.
 */
export function bearingToCompass(bearingDegrees: number): string {
  const normalized = ((bearingDegrees % 360) + 360) % 360;
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index]!;
}
