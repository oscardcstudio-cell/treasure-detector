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
 * MapLibre refuse TOUTE mutation du style (addSource, addLayer, …) tant qu'il
 * n'est pas prêt (« Style is not done loading ») : un clic sur « Score Zone »
 * juste après l'ouverture de la carte tombait sur cette erreur.
 *
 * INVARIANT (vérifié dans le code MapLibre v6) : `map.getStyle()` renvoie
 * `undefined` tant que `style._loaded` est false — la même condition exacte que
 * teste `_checkLoaded()` avant addSource/addLayer. Attendre `getStyle()` truthy
 * garantit donc que les mutations passeront. `isStyleLoaded()` ne convient pas
 * (reste false tant qu'une source annexe charge) et le premier `styledata` peut
 * arriver trop tôt, d'où le re-test dans le handler.
 *
 * Leçon du bug du premier clic : protéger un seul appel ne suffit pas — TOUTES
 * les mutations doivent se faire dans `fn`, exécuté d'un seul bloc synchrone
 * une fois le style prêt (aucun await entre les mutations).
 */
async function withStyleReady<T>(map: MapLibreMap, fn: () => T, timeoutMs = 30000): Promise<T> {
  if (!map.getStyle()) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        map.off('styledata', onStyleData);
        // Démarrage très lent (vieux téléphone, base locale occupée) ou carte
        // détruite entre-temps : un nouveau clic repart sur des bases saines.
        reject(new Error('La carte n’était pas prête — réessayer'));
      }, timeoutMs);
      const onStyleData = () => {
        if (!map.getStyle()) return;
        map.off('styledata', onStyleData);
        clearTimeout(timer);
        resolve();
      };
      map.on('styledata', onStyleData);
      // Si le style est devenu prêt entre le test initial et l'abonnement
      if (map.getStyle()) onStyleData();
    });
  }
  return fn();
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
  // Les handlers carte ne doivent être posés qu'une fois, même si le scoring
  // est relancé (withStyleReady peut ré-exécuter le bloc de mutations).
  const handlersAttachedRef = useRef(false);

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

      // Source + couches + handlers : un seul bloc, exécuté quand le style est prêt
      await withStyleReady(map, () => {
        if (!map.getSource('heatmap-source')) {
          map.addSource('heatmap-source', {
            type: 'geojson',
            data: heatmapGeoJSON,
          });
        } else {
          (map.getSource('heatmap-source') as GeoJSONSource).setData(heatmapGeoJSON);
        }

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
        }

        if (!handlersAttachedRef.current) {
          handlersAttachedRef.current = true;

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

          map.on('mouseenter', 'heatmap-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'heatmap-fill', () => {
            map.getCanvas().style.cursor = '';
          });
        }
      });

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
