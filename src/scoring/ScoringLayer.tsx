/**
 * ScoringLayer — Score zone button + heatmap visualization + WhyPanel
 *
 * Workflow:
 * 1. Click "Score zone" button
 * 2. Loads config/scoring.json + data/derived/toponymes.geojson + config/zone.json
 * 3. Calls scoreZone() to generate H3 heatmap
 * 4. Adds fill layer with opacity 0.35
 * 5. On tap: show WhyPanel with breakdown
 * 6. Toggle button to hide/show layer
 */

import React, { useState, useCallback, useRef } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { scoreZone, generateHeatMap, WhyPanel, getHeatMapPaintSpec } from './index';
import type { ScoreCell } from './types';
import type { ScoringConfig } from './types';

interface ScoringLayerProps {
  map: MapLibreMap | null;
  zoneConfig: any; // zone.json
  scoringConfig: ScoringConfig;
  topoGeoJSON: any; // toponymes.geojson
  onCellSelected?: (cell: ScoreCell | undefined) => void;
}

/**
 * MapLibre refuse addSource/addLayer tant que son style n'est pas prêt
 * (« Style is not done loading ») : un clic sur « Score Zone » juste après
 * l'ouverture de la carte tombait sur cette erreur.
 *
 * On réessaie au lieu de patienter à l'aveugle : `map.isStyleLoaded()` est plus
 * strict que la condition réelle (il reste false tant qu'une source annexe n'a
 * pas fini de charger), donc l'attendre bloquerait pour rien.
 */
async function withStyleReady<T>(fn: () => T, timeoutMs = 10000): Promise<T> {
  const start = Date.now();
  for (;;) {
    try {
      return fn();
    } catch (err) {
      const isStyleNotReady =
        err instanceof Error && /style is not done loading/i.test(err.message);
      if (!isStyleNotReady || Date.now() - start > timeoutMs) throw err;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}

export const ScoringLayer: React.FC<ScoringLayerProps> = ({
  map,
  zoneConfig,
  scoringConfig,
  topoGeoJSON,
  onCellSelected,
}) => {
  const [isScored, setIsScored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<ScoreCell | undefined>();
  const [isLayerVisible, setIsLayerVisible] = useState(true);
  const scoredCellsRef = useRef<ScoreCell[]>([]);

  const handleScore = useCallback(async () => {
    if (!map) {
      setError('Carte non disponible');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Score the zone
      const cells = await scoreZone(scoringConfig, topoGeoJSON, zoneConfig);
      scoredCellsRef.current = cells;

      // Generate heatmap GeoJSON
      const heatmapGeoJSON = generateHeatMap(cells);

      // Add or update source
      await withStyleReady(() => {
        if (!map.getSource('heatmap-source')) {
          map.addSource('heatmap-source', {
            type: 'geojson',
            data: heatmapGeoJSON,
          });
        } else {
          (map.getSource('heatmap-source') as GeoJSONSource).setData(heatmapGeoJSON);
        }
      });

      // Add fill layer if not present
      if (!map.getLayer('heatmap-fill')) {
        const paintSpec = getHeatMapPaintSpec();
        map.addLayer({
          id: 'heatmap-fill',
          type: 'fill',
          source: 'heatmap-source',
          paint: {
            ...paintSpec,
            'fill-opacity': 0.35,
          },
        });

        // Add outline layer
        map.addLayer({
          id: 'heatmap-outline',
          type: 'line',
          source: 'heatmap-source',
          paint: {
            'line-color': '#333',
            'line-width': 1,
            'line-opacity': 0.2,
          },
        });

        // Click handler for cells
        map.on('click', 'heatmap-fill', (e) => {
          if (e.features && e.features[0]) {
            const h3 = e.features[0].properties?.h3;
            if (h3) {
              const cell = scoredCellsRef.current.find((c) => c.h3 === h3);
              setSelectedCell(cell);
              onCellSelected?.(cell);
            }
          }
        });

        // Cursor feedback
        map.on('mouseenter', 'heatmap-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'heatmap-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }

      setIsScored(true);
      setIsLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      setIsLoading(false);
    }
  }, [map, scoringConfig, topoGeoJSON, zoneConfig]);

  const handleToggleLayer = useCallback(() => {
    if (!map) return;

    const shouldShow = !isLayerVisible;
    if (map.getLayer('heatmap-fill')) {
      map.setLayoutProperty('heatmap-fill', 'visibility', shouldShow ? 'visible' : 'none');
    }
    if (map.getLayer('heatmap-outline')) {
      map.setLayoutProperty('heatmap-outline', 'visibility', shouldShow ? 'visible' : 'none');
    }
    setIsLayerVisible(shouldShow);
  }, [map, isLayerVisible]);

  return (
    <>
      {/* Scoring button + controls */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          right: '12px',
          background: '#fff',
          padding: '12px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 500,
          minWidth: '160px',
        }}
      >
        <button
          onClick={handleScore}
          disabled={isLoading || isScored}
          style={{
            width: '100%',
            padding: '8px',
            background: isScored ? '#4CAF50' : '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading || isScored ? 'default' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: isScored ? '8px' : 0,
          }}
        >
          {isLoading ? 'Calcul...' : isScored ? '✓ Scoré' : 'Score Zone'}
        </button>

        {isScored && (
          <button
            onClick={handleToggleLayer}
            style={{
              width: '100%',
              padding: '6px',
              background: isLayerVisible ? '#FFA500' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              marginBottom: '8px',
            }}
          >
            {isLayerVisible ? 'Masquer' : 'Afficher'}
          </button>
        )}

        {error && (
          <div
            style={{
              fontSize: '11px',
              color: '#d32f2f',
              marginTop: '8px',
              padding: '4px',
              background: '#fee',
              borderRadius: '2px',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* WhyPanel overlay */}
      {selectedCell && (
        <WhyPanel
          cell={selectedCell}
          onClose={() => {
            setSelectedCell(undefined);
            onCellSelected?.(undefined);
          }}
        />
      )}
    </>
  );
};
