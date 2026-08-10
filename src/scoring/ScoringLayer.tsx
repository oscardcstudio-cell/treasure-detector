/**
 * ScoringLayer — Score zone button + heatmap visualization
 *
 * Workflow:
 * 1. Click "Score zone" button
 * 2. Loads config/scoring.json + data/derived/toponymes.geojson + config/zone.json
 * 3. Calls scoreZone() to generate H3 heatmap
 * 4. Adds fill layer with opacity 0.35
 * 5. Toggle button to hide/show layer
 *
 * Heatmap NON interactive (décision Engue 2026-08-10) : couche de lecture
 * pure, aucun handler de clic sur les hexagones.
 */

import React, { useState, useCallback, useRef } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { scoreZone, generateHeatMap, getHeatMapPaintSpec } from './index';
import type { ScoreCell } from './types';
import type { ScoringConfig } from './types';

interface ScoringLayerProps {
  map: MapLibreMap | null;
  zoneConfig: any; // zone.json
  scoringConfig: ScoringConfig;
  topoGeoJSON: any; // toponymes.geojson
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
        reject(new Error('La carte n\'était pas prête — réessayer'));
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
}) => {
  const [isScored, setIsScored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

        // Hexagones volontairement NON interactifs (décision Engue 2026-08-10) :
        // la heatmap est une couche de lecture pure. Le clic ouvrait le
        // recommandeur de presets (« labourage frais »), retiré.
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
      {/* Scoring button — chrome pill, top-left (under Cibles legend) */}
      {!isScored || isScored ? (
        <button
          onClick={handleScore}
          disabled={isLoading || isScored}
          className="scoring-pill-btn"
          style={{
            position: 'absolute',
            top: '64px',
            left: '12px',
            background: isScored ? 'oklch(100% 0 0 / 0.12)' : 'var(--td-chrome)',
            color: isScored ? 'var(--td-chrome-ink-soft)' : 'var(--td-chrome-ink)',
            padding: '10px 16px',
            minHeight: '44px',
            border: 'none',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-ambient-lg), var(--inset-highlight)',
            cursor: isLoading || isScored ? 'default' : 'pointer',
            fontSize: '0.78rem',
            fontWeight: '800',
            fontFamily: 'var(--font-body)',
            zIndex: 500,
            transition: 'background var(--dur-ui) ease, color var(--dur-ui) ease, transform var(--dur-press) var(--ease-out-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isScored ? (isLayerVisible ? 'Masquer la couche de score' : 'Afficher la couche de score') : 'Calculer le score de la zone'}
          onMouseDown={(e) => !isLoading && !isScored && (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = '')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        >
          {isLoading ? 'Calcul...' : isScored ? '✓ Scoré' : 'Score Zone'}
        </button>
      ) : null}

      {/* Toggle layer visibility when scored */}
      {isScored && (
        <button
          onClick={handleToggleLayer}
          style={{
            position: 'absolute',
            top: '116px',
            left: '12px',
            background: isLayerVisible ? 'var(--td-chrome)' : 'oklch(100% 0 0 / 0.12)',
            color: isLayerVisible ? 'var(--td-chrome-ink)' : 'var(--td-chrome-ink-soft)',
            padding: '10px 16px',
            minHeight: '44px',
            border: 'none',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-ambient-lg), var(--inset-highlight)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: '800',
            fontFamily: 'var(--font-body)',
            zIndex: 500,
            transition: 'background var(--dur-ui) ease, color var(--dur-ui) ease, transform var(--dur-press) var(--ease-out-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = '')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        >
          {isLayerVisible ? 'Masquer' : 'Afficher'}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: isScored ? '168px' : '116px',
            left: '12px',
            fontSize: '0.78rem',
            fontWeight: '700',
            color: 'oklch(94% 0.05 27)',
            padding: '8px 12px',
            background: 'oklch(66% 0.2 27 / 0.22)',
            border: '1px solid oklch(66% 0.2 27 / 0.45)',
            borderRadius: 'var(--radius-sm)',
            maxWidth: '200px',
            zIndex: 500,
            lineHeight: '1.4',
          }}
        >
          {error}
        </div>
      )}

    </>
  );
};
