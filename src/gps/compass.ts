/**
 * Compass: device heading from deviceorientation API.
 * Guide de bandes: parallel bands for quadrillage navigation.
 *
 * Without this, quadrillaging a bare field is impossible. You can't walk straight or space
 * regularly by eye alone. The map replaces that memory.
 */

import * as turf from '@turf/turf';
import { LonLat } from '../db/types';

export interface CompassReading {
  headingDegrees: number; // 0-360, 0=north
  accuracy?: number; // degrees, implementation-dependent
  timestamp: number;
}

export interface Band {
  id: string;
  line: GeoJSON.LineString; // centerline of the band (WGS84)
  leftEdge: GeoJSON.LineString;
  rightEdge: GeoJSON.LineString;
  isActive: boolean;
  lateralOffsetM?: number; // if negative, we're left of this band; if positive, right
}

export class CompassManager {
  private heading: number = 0;
  private headingUpdatedAt: number = 0;
  private watchId: number | null = null;
  private listeners: Set<(reading: CompassReading) => void> = new Set();

  /**
   * Start listening to deviceorientation events.
   * On iOS, this requires user permission after a user gesture.
   */
  async startWatching(): Promise<void> {
    if (this.watchId !== null) {
      console.warn('Already watching orientation');
      return;
    }

    // iOS 13+ requires permission
    if (typeof (DeviceOrientationEvent as any) !== 'undefined' && (DeviceOrientationEvent as any).requestPermission) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') {
          console.warn('DeviceOrientation permission denied');
          return;
        }
      } catch (e) {
        console.warn('Failed to request DeviceOrientation permission:', e);
        return;
      }
    }

    window.addEventListener('deviceorientation', this.handleOrientation);
    // Marqueur "à l'écoute" — sans lui, chaque startWatching() empilerait un listener de plus
    this.watchId = 1;
  }

  stopWatching(): void {
    window.removeEventListener('deviceorientation', this.handleOrientation);
    this.watchId = null;
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    const alpha = event.alpha ?? 0; // Z axis rotation (0-360, compass)
    // beta and gamma are for potential future use in tilt compensation

    // Simplified: use alpha directly as heading
    // In production, account for magnetic declination and device tilt
    let heading = alpha;

    // Adjust for magnetic declination (France, ~5° W)
    // [HYPOTHÈSE] — no real survey for Armous-et-Cau, using France average
    const declination = -5;
    heading = (heading + declination + 360) % 360;

    this.heading = heading;
    this.headingUpdatedAt = Date.now();

    const reading: CompassReading = {
      headingDegrees: this.heading,
      timestamp: this.headingUpdatedAt,
    };

    this.listeners.forEach((cb) => cb(reading));
  };

  getHeading(): CompassReading {
    return {
      headingDegrees: this.heading,
      timestamp: this.headingUpdatedAt,
    };
  }

  onHeadingChange(callback: (reading: CompassReading) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

/**
 * Band guide: given a center point and a heading, generate parallel bands for quadrillage.
 * The user chooses a direction, and the map shows which band they're in and how far to the next one.
 */
export class BandGuide {
  private centerPoint: LonLat;
  private headingDegrees: number;
  private spacingM: number;
  private bandWidthM: number;
  private zoneExtentM: number; // how far to generate bands (e.g., 500 m)

  constructor(
    centerPoint: LonLat,
    headingDegrees: number,
    spacingM: number = 0.9, // match swathWidthM
    bandWidthM: number = 2.0, // total width of visible corridor
    zoneExtentM: number = 500
  ) {
    this.centerPoint = centerPoint;
    this.headingDegrees = headingDegrees;
    this.spacingM = spacingM;
    this.bandWidthM = bandWidthM;
    this.zoneExtentM = zoneExtentM;
  }

  /**
   * Generate parallel bands centered on a point, oriented along a heading.
   * Returns a list of bands and which one is currently active (closest to the user).
   */
  generateBands(): { bands: Band[]; activeBandIndex?: number } {
    const bands: Band[] = [];

    // Generate a line perpendicular to the heading (for the band centers)
    // Headings run along the direction of travel; perpendicular is 90° offset
    const perpendicularHeading = (this.headingDegrees + 90) % 360;

    const startOffset = -Math.floor(this.zoneExtentM / this.spacingM / 2) * this.spacingM;
    const endOffset = Math.floor(this.zoneExtentM / this.spacingM / 2) * this.spacingM;

    let bandId = 0;
    for (let offset = startOffset; offset <= endOffset; offset += this.spacingM) {
      if (Math.abs(offset) > this.zoneExtentM) continue;

      // Create the center line of this band
      const offsetPoint = turf.destination(turf.point(this.centerPoint), Math.abs(offset) / 1000, offset >= 0 ? perpendicularHeading : (perpendicularHeading + 180) % 360, {
        units: 'kilometers',
      });

      // Create a line along the heading direction
      const bandStartPoint = turf.destination(offsetPoint, 0.25, this.headingDegrees, {
        units: 'kilometers',
      });

      const bandEndPoint = turf.destination(offsetPoint, -0.25, this.headingDegrees, {
        units: 'kilometers',
      });

      const centerLine: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: [
          bandEndPoint.geometry.coordinates as [number, number],
          offsetPoint.geometry.coordinates as [number, number],
          bandStartPoint.geometry.coordinates as [number, number],
        ],
      };

      // Create left and right edges
      const leftHeading = (this.headingDegrees + 90) % 360;
      const leftEdgeStart = turf.destination(bandStartPoint, this.bandWidthM / 2 / 1000, leftHeading, {
        units: 'kilometers',
      });
      const leftEdgeEnd = turf.destination(bandEndPoint, this.bandWidthM / 2 / 1000, leftHeading, {
        units: 'kilometers',
      });

      const leftEdge: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: [
          leftEdgeStart.geometry.coordinates as [number, number],
          leftEdgeEnd.geometry.coordinates as [number, number],
        ],
      };

      const rightHeading = (this.headingDegrees - 90 + 360) % 360;
      const rightEdgeStart = turf.destination(bandStartPoint, this.bandWidthM / 2 / 1000, rightHeading, {
        units: 'kilometers',
      });
      const rightEdgeEnd = turf.destination(bandEndPoint, this.bandWidthM / 2 / 1000, rightHeading, {
        units: 'kilometers',
      });

      const rightEdge: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: [
          rightEdgeStart.geometry.coordinates as [number, number],
          rightEdgeEnd.geometry.coordinates as [number, number],
        ],
      };

      bands.push({
        id: `band-${bandId}`,
        line: centerLine,
        leftEdge,
        rightEdge,
        isActive: Math.abs(offset) < this.spacingM / 2,
      });

      bandId++;
    }

    const activeBandIndex = bands.findIndex((b) => b.isActive);

    return { bands, activeBandIndex };
  }

  /**
   * Compute lateral offset from the user's current position to the nearest band center.
   * Negative = left of the band, positive = right.
   */
  computeLateralOffset(userPosition: LonLat): number {
    // Project user position onto the heading line
    const userPoint = turf.point(userPosition);
    const centerPoint = turf.point(this.centerPoint);

    // Create a line perpendicular to the heading through the center point
    const perpendicularHeading = (this.headingDegrees + 90) % 360;
    const perpLineStart = turf.destination(centerPoint, 0.5, perpendicularHeading, { units: 'kilometers' });
    const perpLineEnd = turf.destination(centerPoint, -0.5, perpendicularHeading, { units: 'kilometers' });

    const perpLine = turf.lineString([
      perpLineStart.geometry.coordinates as [number, number],
      perpLineEnd.geometry.coordinates as [number, number],
    ]);

    // Compute distance from user to the perpendicular line
    const nearestPoint = turf.nearestPointOnLine(perpLine, userPoint);
    const distanceM = turf.distance(userPoint, nearestPoint, { units: 'meters' });

    // Determine sign: is the user left or right of the line?
    // Use dot product
    const perp_rad = (perpendicularHeading * Math.PI) / 180;

    // Vector from center to user
    const dLon = userPosition[0] - this.centerPoint[0];
    const dLat = userPosition[1] - this.centerPoint[1];

    // Dot product with perpendicular direction
    const dot = dLon * Math.cos(perp_rad) + dLat * Math.sin(perp_rad);

    return dot > 0 ? distanceM : -distanceM;
  }
}
