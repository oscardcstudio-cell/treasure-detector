/**
 * useMapIntegration — connects GPS trace to the map via GeoJSON sources
 * Handles live trace, accuracy circle, and swept area rendering.
 */

import { useEffect, useRef } from 'react';
import { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { traceToGeoJSON, accuracyCircleToGeoJSON } from '../gps';
import { TreasureDB, getDatabase } from '../db/schema';
import { UUID } from '../db/types';

export interface useMapIntegrationOptions {
  map: MapLibreMap | null;
  sessionId: UUID | null;
  currentPosition: { coord: [number, number]; accuracyM: number; heading?: number } | null;
  sessionActive: boolean;
}

/**
 * Renders GPS trace and accuracy circle as GeoJSON on the MapLibre canvas.
 * Called whenever currentPosition changes or session state changes.
 */
export function useMapIntegration(options: useMapIntegrationOptions) {
  const { map, sessionId, currentPosition, sessionActive } = options;
  const dbRef = useRef<TreasureDB>(getDatabase());
  const sourceIdsRef = useRef<{ trace: string; accuracy: string }>({
    trace: 'gps-trace-live',
    accuracy: 'gps-accuracy-circle',
  });

  // Initialize sources and layers when map is ready
  useEffect(() => {
    if (!map || !sessionId) return;

    const ensureSource = (sourceId: string, type: 'geojson' | 'raster') => {
      try {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type,
            data: {
              type: 'FeatureCollection',
              features: [],
            } as GeoJSON.FeatureCollection,
          } as any);
        }
      } catch (e) {
        console.warn(`Source ${sourceId} already exists or error:`, e);
      }
    };

    const ensureLayer = (layerId: string, sourceId: string, paint: Record<string, unknown>) => {
      try {
        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint,
          } as any);
        }
      } catch (e) {
        console.warn(`Layer ${layerId} already exists or error:`, e);
      }
    };

    // Initialize trace source and layer
    ensureSource(sourceIdsRef.current.trace, 'geojson');
    ensureLayer(
      'gps-trace-layer',
      sourceIdsRef.current.trace,
      {
        'line-color': '#4CAF50',
        'line-width': 3,
        'line-opacity': 0.8,
      }
    );

    // Initialize accuracy circle source and layer
    ensureSource(sourceIdsRef.current.accuracy, 'geojson');
    ensureLayer(
      'gps-accuracy-layer',
      sourceIdsRef.current.accuracy,
      {
        'line-color': '#2196F3',
        'line-width': 2,
        'line-opacity': 0.6,
        'line-dasharray': [5, 5],
      }
    );
  }, [map, sessionId]);

  // Update trace GeoJSON whenever session or current position changes
  useEffect(() => {
    if (!map || !sessionId || !sessionActive) return;

    (async () => {
      try {
        // Fetch all TrackPoints for this session
        const trackPoints = await dbRef.current.trackPoints
          .where('sessionId')
          .equals(sessionId)
          .toArray();

        if (trackPoints.length > 0) {
          // Convert to GeoJSON LineString
          const lineString = traceToGeoJSON(trackPoints);

          // Wrap in FeatureCollection for source.setData()
          const geoJSON: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: lineString,
              },
            ],
          };

          // Update the trace source
          const source = map.getSource(sourceIdsRef.current.trace) as GeoJSONSource | undefined;
          if (source && 'setData' in source) {
            (source as GeoJSONSource).setData(geoJSON);
          }
        }
      } catch (e) {
        console.error('Error updating trace on map:', e);
      }
    })();
  }, [map, sessionId, sessionActive, currentPosition]);

  // Update accuracy circle whenever current position changes
  useEffect(() => {
    if (!map || !currentPosition || !sessionActive) return;

    try {
      const { coord, accuracyM } = currentPosition;
      // Convert to GeolocationFix format for accuracyCircleToGeoJSON
      const geolocationFix = {
        latitude: coord[1],
        longitude: coord[0],
        accuracy: accuracyM,
        timestamp: Date.now(),
      };

      const accuracyCircleFeature = accuracyCircleToGeoJSON(geolocationFix);

      // Wrap in FeatureCollection
      const geoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [accuracyCircleFeature],
      };

      const source = map.getSource(sourceIdsRef.current.accuracy) as GeoJSONSource | undefined;
      if (source && 'setData' in source) {
        (source as GeoJSONSource).setData(geoJSON);
      }
    } catch (e) {
      console.error('Error updating accuracy circle:', e);
    }
  }, [map, currentPosition, sessionActive]);
}
