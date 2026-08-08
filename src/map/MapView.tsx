import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import zoneConfig from '../../config/zone.json';
import scoringConfig from '../../config/scoring.json';
import { LAYERS, BASEMAP_DEFAULTS, HistoricLayerId } from './layers';
import { ScoringLayer } from '../scoring/ScoringLayer';
import type { ScoreCell } from '../scoring/types';

interface MapState {
  baseLayer: string;
  activeHistoricLayer: HistoricLayerId | null;
  historicOpacity: number;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

const STORAGE_KEY = 'treasure-detector:map-state';

export interface MapViewProps {
  onMapReady?: (map: MapLibreMap) => void;
  onScoredCellSelected?: (cell: ScoreCell | undefined) => void;
}

/**
 * MapView — Carte principale centrée sur la zone
 * - Sélection de fond (Plan IGN / Ortho)
 * - Superposition de couche historique avec opacité réglable
 * - Slider de comparaison (rideau) pour avant/après
 * - Persistance de l'état dans localStorage
 */
/**
 * Exécute `fn` dès que le style est réellement exploitable.
 *
 * `map.getStyle()` renvoie `undefined` tant que le style n'est pas chargé —
 * c'est exactement la condition que MapLibre teste avant d'accepter
 * addSource/addLayer. `isStyleLoaded()` ne convient pas : il reste faux tant
 * qu'une source annexe n'a pas fini de charger, et le premier `styledata`
 * arrive trop tôt.
 */
function whenStyleReady(map: MapLibreMap, fn: () => void) {
  if (map.getStyle()) {
    fn();
    return;
  }
  const onStyleData = () => {
    if (!map.getStyle()) return;
    map.off('styledata', onStyleData);
    fn();
  };
  map.on('styledata', onStyleData);
}

/**
 * Insère (ou remplace) une couche raster en la gardant SOUS toutes les couches
 * vectorielles déjà posées — heatmap du scoring, trace GPS, trouvailles.
 * Sans ce `beforeId`, changer de fond de carte recouvrirait tout le reste.
 */
function syncRasterLayer(
  map: MapLibreMap,
  opts: {
    layerId: string;
    sourceId: string;
    url: string;
    attribution: string;
    minZoom: number;
    opacity?: number;
  }
) {
  const { layerId, sourceId, url, attribution, minZoom, opacity } = opts;

  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, { type: 'raster', tiles: [url], tileSize: 256, attribution });

  const firstNonRaster = map.getStyle().layers.find((l) => l.type !== 'raster')?.id;
  map.addLayer(
    {
      id: layerId,
      type: 'raster',
      source: sourceId,
      minzoom: minZoom,
      maxzoom: 24,
      ...(opacity !== undefined ? { paint: { 'raster-opacity': opacity } } : {}),
    },
    firstNonRaster
  );
}

export default function MapView({ onMapReady, onScoredCellSelected }: MapViewProps = {}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  /**
   * La carte est aussi exposée en state : les composants enfants (ScoringLayer…)
   * doivent re-rendre quand elle devient disponible. Une ref seule ne déclenche
   * pas de rendu — ils recevaient alors `null`, ou pire une carte périmée.
   */
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [selectedCell, setSelectedCell] = useState<ScoreCell | undefined>();
  const [topoGeoJSON, setTopoGeoJSON] = useState<any>(null);

  // Load toponymy data on mount
  useEffect(() => {
    fetch('/data/derived/toponymes.geojson')
      .then((res) => res.json())
      .then(setTopoGeoJSON)
      .catch((err) => console.error('Failed to load toponymes:', err));
  }, []);

  const [mapState, setMapState] = useState<MapState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Malformed storage, reset
      }
    }
    return {
      baseLayer: BASEMAP_DEFAULTS.default,
      activeHistoricLayer: null,
      historicOpacity: 0.5,
      center: zoneConfig.center as [number, number],
      zoom: zoneConfig.defaultZoom,
      pitch: 0,
      bearing: 0,
    };
  });

  // Sauvegarder l'état à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapState));
  }, [mapState]);

  /**
   * Position/zoom d'ouverture, figés au montage.
   *
   * INVARIANT : la carte est créée UNE SEULE FOIS (deps `[]`). Faire dépendre
   * cet effet de `mapState.center/zoom/...` la détruisait et la recréait à
   * chaque geste — le handler de mouvement réécrit ces valeurs, et `center` est
   * un nouveau tableau à chaque fois. Tout ce qui est posé impérativement sur la
   * carte (hexagones du scoring, position GPS, traces, trouvailles) disparaissait
   * donc au premier déplacement du doigt. Fond de carte et couche historique se
   * mettent à jour par des effets dédiés, sans recréer la carte.
   */
  const initialViewRef = useRef({
    center: mapState.center,
    zoom: mapState.zoom,
    pitch: mapState.pitch,
    bearing: mapState.bearing,
    baseLayer: mapState.baseLayer,
  });
  const appliedBaseLayerRef = useRef(mapState.baseLayer);

  useEffect(() => {
    if (!mapContainer.current) return;

    const initial = initialViewRef.current;
    const baseLayerDef = LAYERS[initial.baseLayer as keyof typeof LAYERS];
    if (!baseLayerDef) return;

    const style: StyleSpecification = {
      version: 8,
      sources: {
        'base-raster': {
          type: 'raster',
          tiles: [baseLayerDef.url],
          tileSize: 256,
          attribution: baseLayerDef.attribution,
        },
      },
      layers: [
        {
          id: 'base-layer',
          type: 'raster' as const,
          source: 'base-raster',
          minzoom: baseLayerDef.minZoom,
          maxzoom: 24,
        },
      ],
    };

    const instance = new MapLibreMap({
      container: mapContainer.current,
      style,
      center: initial.center,
      zoom: initial.zoom,
      pitch: initial.pitch,
      bearing: initial.bearing,
      attributionControl: false,
    });
    map.current = instance;

    instance.addControl(new NavigationControl(), 'top-right');

    /**
     * La carte peut naître dans un conteneur pas encore mesuré (0×0 pendant le
     * premier layout) : MapLibre retombe alors sur un canvas 400×300 ET avale
     * volontairement le premier événement de son propre ResizeObserver — celui
     * qui portait la vraie taille. Si le conteneur ne bouge plus ensuite, la
     * carte reste tronquée en haut à gauche pour toujours (constaté en prod).
     * Notre propre observateur, lui, reçoit l'événement initial et recale le
     * canvas immédiatement.
     */
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => instance.resize());
      resizeObserver.observe(mapContainer.current);
    }

    setMapInstance(instance);
    onMapReady?.(instance);

    // `moveend` et non `move` : persister la vue ne justifie pas un rendu React
    // à chaque image du déplacement.
    const onMoveEnd = () => {
      setMapState((prev) => ({
        ...prev,
        center: instance.getCenter().toArray() as [number, number],
        zoom: instance.getZoom(),
        pitch: instance.getPitch(),
        bearing: instance.getBearing(),
      }));
    };
    instance.on('moveend', onMoveEnd);

    return () => {
      resizeObserver?.disconnect();
      instance.off('moveend', onMoveEnd);
      instance.remove();
      map.current = null;
      setMapInstance(null);
    };
    // deps [] volontaire : création unique, cf. commentaire INVARIANT ci-dessus
  }, []);

  // Changement de fond de carte — sans recréer la carte
  useEffect(() => {
    const instance = mapInstance;
    const def = LAYERS[mapState.baseLayer as keyof typeof LAYERS];
    if (!instance || !def) return;

    // Le style initial porte déjà le bon fond : ne rien refaire au montage.
    if (mapState.baseLayer === appliedBaseLayerRef.current) return;
    appliedBaseLayerRef.current = mapState.baseLayer;

    whenStyleReady(instance, () =>
      syncRasterLayer(instance, {
        layerId: 'base-layer',
        sourceId: 'base-raster',
        url: def.url,
        attribution: def.attribution,
        minZoom: def.minZoom,
      })
    );
  }, [mapInstance, mapState.baseLayer]);

  // Couche historique en surimpression — ajout/retrait sans recréer la carte
  useEffect(() => {
    const instance = mapInstance;
    if (!instance) return;

    const historicId = mapState.activeHistoricLayer;
    const apply = () => {
      if (!historicId) {
        if (instance.getLayer('historic-layer')) instance.removeLayer('historic-layer');
        if (instance.getSource('historic-raster')) instance.removeSource('historic-raster');
        return;
      }
      const def = LAYERS[historicId as keyof typeof LAYERS];
      if (!def) return;
      syncRasterLayer(instance, {
        layerId: 'historic-layer',
        sourceId: 'historic-raster',
        url: def.url,
        attribution: def.attribution,
        minZoom: def.minZoom,
        opacity: mapState.historicOpacity,
      });
    };

    whenStyleReady(instance, apply);
    // l'opacité a son propre effet : la ré-appliquer ici recréerait la couche
    // à chaque cran du curseur (deps volontairement sans historicOpacity).
  }, [mapInstance, mapState.activeHistoricLayer]);

  // Mettre à jour l'opacité de la couche historique
  useEffect(() => {
    if (!mapInstance || !mapState.activeHistoricLayer) return;
    if (!mapInstance.getLayer('historic-layer')) return;
    mapInstance.setPaintProperty('historic-layer', 'raster-opacity', mapState.historicOpacity);
  }, [mapInstance, mapState.historicOpacity, mapState.activeHistoricLayer]);

  const handleBaseLayerChange = (layerId: string) => {
    setMapState((prev) => ({ ...prev, baseLayer: layerId }));
  };

  const handleHistoricLayerChange = (layerId: HistoricLayerId | null) => {
    setMapState((prev) => ({ ...prev, activeHistoricLayer: layerId }));
  };

  const handleOpacityChange = (opacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    setMapState((prev) => ({ ...prev, historicOpacity: clampedOpacity }));
  };

  // Notify parent of cell selection
  useEffect(() => {
    onScoredCellSelected?.(selectedCell);
  }, [selectedCell, onScoredCellSelected]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Carte */}
      <div style={{ flex: 1, position: 'relative' }} ref={mapContainer}>
        {/* Scoring layer + heatmap visualization */}
        {mapInstance && topoGeoJSON && (
          <ScoringLayer
            map={mapInstance}
            zoneConfig={zoneConfig}
            scoringConfig={scoringConfig as any}
            topoGeoJSON={topoGeoJSON}
            onCellSelected={setSelectedCell}
          />
        )}
      </div>

      {/* Panneau de contrôle — mobile-first */}
      <div
        style={{
          padding: '12px',
          background: '#fff',
          borderTop: '1px solid #ccc',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '14px',
        }}
      >
        {/* Sélecteur de fond */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Fond:</label>
          <select
            value={mapState.baseLayer}
            onChange={(e) => handleBaseLayerChange(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              borderRadius: '4px',
              border: '1px solid #999',
              cursor: 'pointer',
            }}
          >
            {BASEMAP_DEFAULTS.options.map((layerId) => {
              const layer = LAYERS[layerId as keyof typeof LAYERS];
              return (
                <option key={layerId} value={layerId}>
                  {layer?.label || layerId}
                </option>
              );
            })}
          </select>
        </div>

        {/* Sélecteur de couche historique */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Historique:</label>
          <select
            value={mapState.activeHistoricLayer || ''}
            onChange={(e) => handleHistoricLayerChange((e.target.value || null) as HistoricLayerId | null)}
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              borderRadius: '4px',
              border: '1px solid #999',
              cursor: 'pointer',
            }}
          >
            <option value="">— Aucune —</option>
            {(['cassini', 'etat-major', 'ortho-1950-65', 'ortho-irc'] as const).map((layerId) => {
              const layer = LAYERS[layerId as keyof typeof LAYERS];
              return (
                <option key={layerId} value={layerId}>
                  {layer?.label || layerId}
                </option>
              );
            })}
          </select>
        </div>

        {/* Curseur d'opacité */}
        {mapState.activeHistoricLayer && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', color: '#666' }}>Opacité:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(mapState.historicOpacity * 100)}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value, 10) / 100)}
              style={{
                width: '100px',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '12px', color: '#666', width: '30px' }}>
              {Math.round(mapState.historicOpacity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Pied de page — attribution */}
      <div
        style={{
          padding: '8px 12px',
          background: '#f5f5f5',
          borderTop: '1px solid #ddd',
          fontSize: '11px',
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{zoneConfig.name} • © IGN</span>
        <span style={{ fontSize: '10px' }}>Zoom: {Math.round(mapState.zoom * 10) / 10}</span>
      </div>
    </div>
  );
}
