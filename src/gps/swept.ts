/**
 * SweptArea: incremental calculation of buffered trace.
 * Encodes honest coverage: ratisse (dense sweep) vs passage_rapide (quick pass).
 *
 * The key decision point is mean segment speed:
 * - ≤ 0.45 m/s (~1.6 km/h) → 'ratisse' (full quadrillage, renders solid, blocks re-traversal)
 * - > 0.45 m/s → 'passage_rapide' (quick pass, renders hatched, doesn't block)
 *
 * [HYPOTHÈSE] The 0.45 m/s threshold is a placeholder; it will be calibrated from real traces
 * after the first few field sessions. Until then, this value is taken from §6.1 and §9.3 of PLAN.md.
 */

import * as turf from '@turf/turf';
import { TreasureDB } from '../db/schema';
import { TrackPoint, SweptArea, UUID } from '../db/types';
import { generateUUID } from '../lib/uuid';

export const SPEED_THRESHOLD_RATISSE_MS = 0.45; // m/s — speed below which we call it "ratisse"

/**
 * Calculate SweptArea from a sequence of TrackPoint.
 * Returns a GeoJSON Polygon or MultiPolygon (WGS84).
 */
export async function computeSweptArea(
  db: TreasureDB,
  sessionId: UUID,
  swathWidthM: number = 0.9
): Promise<SweptArea | null> {
  // Fetch all TrackPoints for this session
  const points = await db.trackPoints.where('sessionId').equals(sessionId).toArray();

  if (points.length === 0) {
    return null;
  }

  // Sort by timestamp
  points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // Split into segments: gaps > 30s create new segment
  const segments = splitIntoSegments(points, 30000);

  if (segments.length === 0) {
    return null;
  }

  // Build features for each segment
  const segmentFeatures: Array<{ geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon; coverage: 'ratisse' | 'passage_rapide'; meanSpeed: number }> = [];

  for (const segment of segments) {
    if (segment.length < 2) continue; // Need at least 2 points for a line

    // Create LineString
    const line = turf.lineString(segment.map((p) => [p.coord[0], p.coord[1]] as [number, number]));

    // Compute mean speed
    const meanSpeed = computeMeanSegmentSpeed(segment);
    const coverage = meanSpeed <= SPEED_THRESHOLD_RATISSE_MS ? 'ratisse' : 'passage_rapide';

    // Buffer the line
    const buffered = turf.buffer(line, swathWidthM, { units: 'meters' });

    if (buffered && buffered.geometry.type === 'Polygon') {
      segmentFeatures.push({
        geometry: buffered.geometry as GeoJSON.Polygon,
        coverage,
        meanSpeed,
      });
    } else if (buffered && buffered.geometry.type === 'MultiPolygon') {
      segmentFeatures.push({
        geometry: buffered.geometry as GeoJSON.MultiPolygon,
        coverage,
        meanSpeed,
      });
    }
  }

  if (segmentFeatures.length === 0) {
    return null;
  }

  // Union all segment buffers into one geometry
  let unionGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon = segmentFeatures[0]!.geometry;
  for (let i = 1; i < segmentFeatures.length; i++) {
    try {
      const currentFeature = segmentFeatures[i];
      if (!currentFeature) continue;

      // Convert to Features for turf.union
      const poly1: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> = {
        type: 'Feature',
        geometry: unionGeometry,
        properties: null,
      };
      const poly2: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> = {
        type: 'Feature',
        geometry: currentFeature.geometry,
        properties: null,
      };

      const union = turf.union(poly1 as any, poly2 as any);
      if (union && union.geometry && (union.geometry.type === 'Polygon' || union.geometry.type === 'MultiPolygon')) {
        unionGeometry = union.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
      }
    } catch (e) {
      console.warn('Failed to union geometries, keeping previous result:', e);
    }
  }

  // Determine overall coverage: if ANY segment is 'ratisse', the whole area is 'ratisse'
  // (conservative: assume the densest sweep applies)
  const overallCoverage = segmentFeatures.some((f) => f.coverage === 'ratisse')
    ? 'ratisse'
    : 'passage_rapide';

  const sweptArea: SweptArea = {
    id: generateUUID(),
    sessionId,
    geometry: unionGeometry,
    swathWidthM,
    coverage: overallCoverage,
    computedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deviceId: 'device-unknown',
    deleted: false,
  };

  return sweptArea;
}

/**
 * Split TrackPoints into segments based on time gaps.
 * INVARIANT #7: A gap > threshold means the next point starts a new segment.
 */
function splitIntoSegments(points: TrackPoint[], gapThresholdMs: number): TrackPoint[][] {
  const segments: TrackPoint[][] = [];
  let currentSegment: TrackPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point) continue;

    if (i === 0) {
      currentSegment = [point];
    } else {
      const prevPoint = points[i - 1];
      if (!prevPoint) continue;

      const prevTime = new Date(prevPoint.at).getTime();
      const currTime = new Date(point.at).getTime();
      const gap = currTime - prevTime;

      if (gap > gapThresholdMs) {
        // End current segment, start new one
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
        }
        currentSegment = [point];
      } else {
        currentSegment.push(point);
      }
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Compute mean speed of a segment in m/s.
 * Uses points that have speedMs set, otherwise estimates from distance/time.
 */
function computeMeanSegmentSpeed(segment: TrackPoint[]): number {
  if (segment.length < 2) return 0;

  let totalSpeed = 0;
  let countWithSpeed = 0;

  // Collect speeds from points that have them
  for (const point of segment) {
    if (point.speedMs !== undefined && point.speedMs !== null) {
      totalSpeed += point.speedMs;
      countWithSpeed++;
    }
  }

  if (countWithSpeed > 0) {
    return totalSpeed / countWithSpeed;
  }

  // Fallback: estimate from total distance and time
  const firstPoint = segment[0];
  const lastPoint = segment[segment.length - 1];
  if (!firstPoint || !lastPoint) {
    return 0;
  }

  const firstTime = new Date(firstPoint.at).getTime();
  const lastTime = new Date(lastPoint.at).getTime();
  const timeDiffSec = (lastTime - firstTime) / 1000;

  if (timeDiffSec === 0) {
    return 0;
  }

  // Haversine distance
  let totalDistanceM = 0;
  for (let i = 1; i < segment.length; i++) {
    const prevPoint = segment[i - 1];
    const currPoint = segment[i];
    if (prevPoint === undefined || currPoint === undefined) continue;

    const from = turf.point([prevPoint.coord[0], prevPoint.coord[1]]);
    const to = turf.point([currPoint.coord[0], currPoint.coord[1]]);
    const distM = turf.distance(from, to, { units: 'meters' });
    totalDistanceM += distM;
  }

  return totalDistanceM / timeDiffSec;
}

/**
 * Format SweptArea geometry as GeoJSON for export.
 */
export function sweptAreaToGeoJSON(area: SweptArea): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {
      id: area.id,
      sessionId: area.sessionId,
      swathWidthM: area.swathWidthM,
      coverage: area.coverage,
      computedAt: area.computedAt,
    },
    geometry: area.geometry,
  };
}
