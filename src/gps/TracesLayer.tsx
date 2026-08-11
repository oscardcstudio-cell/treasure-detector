/**
 * TracesLayer — affiche le quadrillage déjà couvert : les traces GPS de toutes
 * les sessions passées (et de la session en cours, rafraîchie à la fin).
 *
 * INVARIANT (PLAN §6) : aucune interpolation en ligne droite à travers un trou
 * de trace — un segment est coupé dès que deux fixes sont séparés de plus de
 * 60 s ou de plus de 150 m.
 */

import { useEffect } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { getDatabase } from '../db/schema';
import type { TrackPoint } from '../db/types';

const GAP_MS = 60_000;
const GAP_M = 150;

function distM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const Δφ = φ2 - φ1;
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180;
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Découpe les points d'une session en segments continus (pas de pont sur les trous). */
export function splitSegments(points: TrackPoint[]): [number, number][][] {
  const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at));
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  let prev: TrackPoint | null = null;

  for (const p of sorted) {
    if (prev) {
      const dt = new Date(p.at).getTime() - new Date(prev.at).getTime();
      if (dt > GAP_MS || distM(prev.coord, p.coord) > GAP_M) {
        if (current.length >= 2) segments.push(current);
        current = [];
      }
    }
    current.push(p.coord);
    prev = p;
  }
  if (current.length >= 2) segments.push(current);
  return segments;
}

interface TracesLayerProps {
  map: MapLibreMap | null;
  /** Change à chaque fin de session / nouvel enregistrement pour recharger. */
  refreshKey: number;
}

export const TracesLayer: React.FC<TracesLayerProps> = ({ map, refreshKey }) => {
  useEffect(() => {
    if (!map) return;
    let cancelled = false;

    const apply = async () => {
      const db = getDatabase();
      const points = await db.trackPoints.toArray();
      if (cancelled) return;

      // Grouper par session puis segmenter (les trous ne sont jamais pontés)
      const bySession = new Map<string, TrackPoint[]>();
      for (const p of points) {
        const arr = bySession.get(p.sessionId);
        if (arr) arr.push(p);
        else bySession.set(p.sessionId, [p]);
      }
      const allSegments: [number, number][][] = [];
      for (const sessionPoints of bySession.values()) {
        allSegments.push(...splitSegments(sessionPoints));
      }

      const geojson = {
        type: 'FeatureCollection' as const,
        features: allSegments.map((coords) => ({
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: coords },
          properties: {},
        })),
      };

      if (!map.getSource('traces')) {
        map.addSource('traces', { type: 'geojson', data: geojson });
      } else {
        (map.getSource('traces') as GeoJSONSource).setData(geojson);
      }

      if (!map.getLayer('traces-lines')) {
        map.addLayer({
          id: 'traces-lines',
          type: 'line',
          source: 'traces',
          paint: {
            'line-color': '#2d7ff9',
            'line-width': 3,
            'line-opacity': 0.45,
          },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
      }
    };

    if (map.isStyleLoaded()) {
      void apply();
    } else {
      map.once('load', () => void apply());
    }

    return () => {
      cancelled = true;
    };
  }, [map, refreshKey]);

  return null;
};

export default TracesLayer;
