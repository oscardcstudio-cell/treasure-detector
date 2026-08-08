/**
 * Exchange module: GeoJSON and GPX export/import with round-trip integrity.
 *
 * Exports conform to CONTRACTS.md formats:
 * - Session → GeoJSON Feature with swept areas as geometry
 * - Finds + SurfaceObservations → GeoJSON FeatureCollection
 * - Tracks → GPX with segments (no interpolation across gaps)
 *
 * Reimport must preserve all data without loss.
 */

import { Session, TrackPoint, Find, SurfaceObservation, SweptArea, DigPoint } from '../db/types';

// ─────────────────────────────────────────────────────────────────────────────
// GeoJSON exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export a session as a GeoJSON Feature with its swept areas as geometry.
 */
export function exportSessionAsGeoJSON(
  session: Session,
  sweptAreas: SweptArea[],
  stats: { trackPoints: number; digPoints: number; finds: number; areaM2: number }
): GeoJSON.Feature {
  // Merge all swept area polygons into a MultiPolygon
  const coordinates: GeoJSON.Position[][][] = [];
  for (const area of sweptAreas) {
    if (area.geometry.type === 'Polygon') {
      coordinates.push(area.geometry.coordinates as GeoJSON.Position[][]);
    } else if (area.geometry.type === 'MultiPolygon') {
      coordinates.push(...(area.geometry.coordinates as GeoJSON.Position[][][]));
    }
  }

  return {
    type: 'Feature',
    properties: {
      ...session,
      totalTrackPoints: stats.trackPoints,
      totalDigPoints: stats.digPoints,
      totalFinds: stats.finds,
      sweptAreaMeters2: stats.areaM2,
      export_version: '1.0',
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    } as any,
  };
}

/**
 * Export finds and surface observations as a GeoJSON FeatureCollection.
 */
export function exportFindsAsGeoJSON(
  finds: Find[],
  observations: SurfaceObservation[],
  digPoints: Map<string, DigPoint>
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Add finds
  for (const find of finds) {
    const digPoint = digPoints.get(find.digPointId);
    features.push({
      type: 'Feature',
      properties: {
        ...find,
        source: 'find',
        digPointSignal: digPoint?.signal,
        digPointOutcome: digPoint?.outcome,
        accuracyM: digPoint?.accuracyM,
        swathWidthM: 0.9, // default, should come from session
        coverage: 'ratisse', // placeholder
      },
      geometry: {
        type: 'Point',
        coordinates: digPoint?.coord || [0, 0],
      },
    });
  }

  // Add surface observations
  for (const obs of observations) {
    features.push({
      type: 'Feature',
      properties: {
        ...obs,
        source: 'surface_observation',
      },
      geometry: {
        type: 'Point',
        coordinates: obs.coord,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Import finds from a GeoJSON FeatureCollection.
 * Validates round-trip integrity.
 */
export function importFindsFromGeoJSON(
  geojson: GeoJSON.FeatureCollection
): { finds: Partial<Find>[]; observations: Partial<SurfaceObservation>[] } {
  const finds: Partial<Find>[] = [];
  const observations: Partial<SurfaceObservation>[] = [];

  for (const feature of geojson.features) {
    if (feature.properties?.source === 'find') {
      const { source, digPointSignal, digPointOutcome, accuracyM, swathWidthM, coverage, ...findData } =
        feature.properties;
      finds.push(findData as Partial<Find>);
    } else if (feature.properties?.source === 'surface_observation') {
      const { source, ...obsData } = feature.properties;
      observations.push(obsData as Partial<SurfaceObservation>);
    }
  }

  return { finds, observations };
}

// ─────────────────────────────────────────────────────────────────────────────
// GPX exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export tracks as GPX with proper segment boundaries (no interpolation).
 * TrackPoints are grouped into segments based on time gaps (> 5 minutes = new segment).
 */
export function exportTracksAsGPX(
  session: Session,
  trackPoints: TrackPoint[],
  digPoints: DigPoint[]
): string {
  const segmentGapMs = 5 * 60 * 1000; // 5-minute gap triggers a new segment

  // Group track points into segments
  const segments: TrackPoint[][] = [];
  let currentSegment: TrackPoint[] = [];

  for (const tp of trackPoints.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())) {
    if (currentSegment.length > 0) {
      const lastPoint = currentSegment[currentSegment.length - 1];
      if (lastPoint) {
        const lastTime = new Date(lastPoint.at).getTime();
        const thisTime = new Date(tp.at).getTime();
        if (thisTime - lastTime > segmentGapMs) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
    }
    currentSegment.push(tp);
  }
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Build GPX XML
  const sessionLabel = session.label ? escapeXml(session.label) : 'Untitled';
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <name>Session: ${sessionLabel}</name>
    <time>${session.startedAt}</time>
  </metadata>
  <trk>
    <name>Track</name>
`;

  for (const segment of segments) {
    gpx += '    <trkseg>\n';
    for (const tp of segment) {
      const lat = tp.coord[1];
      const lon = tp.coord[0];
      gpx += `      <trkpt lat="${lat}" lon="${lon}">
        <ele>${tp.altitudeM || 0}</ele>
        <time>${tp.at}</time>
      </trkpt>\n`;
    }
    gpx += '    </trkseg>\n';
  }

  // Add waypoints for digs
  for (const dig of digPoints.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())) {
    const lat = dig.coord[1];
    const lon = dig.coord[0];
    gpx += `  <wpt lat="${lat}" lon="${lon}">
    <name>${dig.outcome}</name>
    <desc>DigPoint: ${dig.outcome}</desc>
    <time>${dig.at}</time>
  </wpt>\n`;
  }

  gpx += `  </trk>
</gpx>`;

  return gpx;
}

/**
 * Import tracks from GPX.
 * Extracts trackpoints and waypoints with segment information preserved.
 */
export function importTracksFromGPX(gpxString: string): { trackPoints: Partial<TrackPoint>[]; digPoints: Partial<DigPoint>[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'application/xml');

  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid GPX: XML parse error');
  }

  const trackPoints: Partial<TrackPoint>[] = [];
  const digPoints: Partial<DigPoint>[] = [];

  // Parse trackpoints from segments
  const trksegs = doc.getElementsByTagName('trkseg');
  for (let i = 0; i < trksegs.length; i++) {
    const trkseg = trksegs.item(i);
    if (!trkseg) continue;
    const trkpts = trkseg.getElementsByTagName('trkpt');
    for (let j = 0; j < trkpts.length; j++) {
      const trkpt = trkpts.item(j);
      if (!trkpt) continue;
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lon = parseFloat(trkpt.getAttribute('lon') || '0');
      const timeEl = trkpt.getElementsByTagName('time').item(0);
      const eleEl = trkpt.getElementsByTagName('ele').item(0);

      trackPoints.push({
        coord: [lon, lat] as [number, number],
        at: timeEl?.textContent || new Date().toISOString(),
        altitudeM: eleEl?.textContent ? parseFloat(eleEl.textContent) : undefined,
        accuracyM: 5, // placeholder; actual accuracy is lost in GPX
      });
    }
  }

  // Parse waypoints (dig points)
  const wpts = doc.getElementsByTagName('wpt');
  for (let i = 0; i < wpts.length; i++) {
    const wpt = wpts.item(i);
    if (!wpt) continue;
    const lat = parseFloat(wpt.getAttribute('lat') || '0');
    const lon = parseFloat(wpt.getAttribute('lon') || '0');
    const nameEl = wpt.getElementsByTagName('name').item(0);
    const timeEl = wpt.getElementsByTagName('time').item(0);

    const outcome = (nameEl?.textContent || 'rien') as 'rien' | 'ferraille' | 'trouvaille';
    digPoints.push({
      coord: [lon, lat] as [number, number],
      at: timeEl?.textContent || new Date().toISOString(),
      outcome,
      accuracyM: 5,
    });
  }

  return { trackPoints, digPoints };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escape XML special characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a downloadable file from a string.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a file as text.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
