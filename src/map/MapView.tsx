import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import zoneConfig from '../../config/zone.json';
import scoringConfig from '../../config/scoring.json';
import { LAYERS, BASEMAP_DEFAULTS, HistoricLayerId, LIDAR_LAYERS, LIDAR_LAYER_IDS, LidarLayerId } from './layers';
import { initPMTilesProtocol, createPMTilesSource } from '../geo/pmtiles';
import { ScoringLayer } from '../scoring/ScoringLayer';
import type { ScoreCell } from '../scoring/types';
import { TargetsLayer } from '../targets/TargetsLayer';

interface MapState {
  baseLayer: string;
  activeHistoricLayer: HistoricLayerId | null;
  historicOpacity: number;
  activeLidarLayer: LidarLayerId | null;
  lidarOpacity: number;
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
  const [layersOpen, setLayersOpen] = useState(false);
  /**
   * Vrai après le premier 'idle' de la carte (base affichée). Les couches
   * restaurées de localStorage (historique, relief) ne se posent qu'à ce
   * moment-là : les ajouter PENDANT l'init gèle le premier rendu en build de
   * prod — carte noire/fondu figé jusqu'au premier geste (constaté 2026-08-10,
   * reproduit : relief actif au boot = noir ; relief posé après coup = OK).
   */
  const [mapSettled, setMapSettled] = useState(false);

  // Load toponymy data on mount
  useEffect(() => {
    fetch('/data/derived/toponymes.geojson')
      .then((res) => res.json())
      .then(setTopoGeoJSON)
      .catch((err) => console.error('Failed to load toponymes:', err));
  }, []);

  const [mapState, setMapState] = useState<MapState>(() => {
    const defaults: MapState = {
      baseLayer: BASEMAP_DEFAULTS.default,
      activeHistoricLayer: null,
      historicOpacity: 0.5,
      activeLidarLayer: null,
      lidarOpacity: 0.7,
      center: zoneConfig.center as [number, number],
      zoom: zoneConfig.defaultZoom,
      pitch: 0,
      bearing: 0,
    };
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        // Fusion avec les defaults : un état sauvegardé par une version
        // antérieure n'a pas les champs ajoutés depuis (ex. couches LiDAR).
        return { ...defaults, ...JSON.parse(saved) };
      } catch {
        // Malformed storage, reset
      }
    }
    return defaults;
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

    /**
     * Filet anti « premier rendu avalé » : en build de prod (constaté après la
     * refonte claymorphism), les frames auto-programmées de MapLibre ne partent
     * pas au démarrage — carte noire (ou figée en plein fondu de tuiles) jusqu'au
     * premier geste, après quoi tout est normal. On pompe donc des frames via
     * requestAnimationFrame pendant ~2 s après la création et après le 'load'
     * du style, le temps que fondu et premier affichage aboutissent.
     */
    const pumpStart = performance.now();
    let pumpSettledAt: number | null = null;
    let pumpRaf: number | null = null;
    let pumpStopped = false;
    const pump = () => {
      if (pumpStopped) return;
      instance.triggerRepaint();
      const now = performance.now();
      const settled = instance.isStyleLoaded() && instance.areTilesLoaded();
      if (settled && pumpSettledAt === null) pumpSettledAt = now;
      if (!settled) pumpSettledAt = null;
      // Stop : 1,5 s après stabilisation (le temps du fondu), plafond 20 s
      const done = (pumpSettledAt !== null && now - pumpSettledAt > 1500) || now - pumpStart > 20000;
      pumpRaf = done ? null : requestAnimationFrame(pump);
    };
    pump();

    /**
     * « Micro-geste » : en build, le premier calcul de couverture de tuiles
     * n'aboutit pas toujours (carte noire jusqu'au premier zoom/drag, qui
     * répare tout). jumpTo sur place déclenche movestart→moveend et force le
     * recalcul complet — l'équivalent programmatique du geste utilisateur.
     */
    const nudge = () => {
      instance.resize();
      instance.jumpTo({ center: instance.getCenter(), zoom: instance.getZoom() });
    };
    instance.once('load', nudge);
    const nudgeTimer = window.setTimeout(nudge, 1200);

    // Débloque la pose des couches restaurées (voir mapSettled)
    instance.once('idle', () => setMapSettled(true));
    const settleTimer = window.setTimeout(() => setMapSettled(true), 4000);

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
      pumpStopped = true;
      if (pumpRaf !== null) cancelAnimationFrame(pumpRaf);
      window.clearTimeout(settleTimer);
      window.clearTimeout(nudgeTimer);
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
    if (!instance || !mapSettled) return;

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
  }, [mapInstance, mapSettled, mapState.activeHistoricLayer]);

  // Mettre à jour l'opacité de la couche historique
  useEffect(() => {
    if (!mapInstance || !mapState.activeHistoricLayer) return;
    if (!mapInstance.getLayer('historic-layer')) return;
    mapInstance.setPaintProperty('historic-layer', 'raster-opacity', mapState.historicOpacity);
  }, [mapInstance, mapState.historicOpacity, mapState.activeHistoricLayer]);

  // Couche relief LiDAR (PMTiles distant) — même mécanique que l'historique
  useEffect(() => {
    const instance = mapInstance;
    if (!instance || !mapSettled) return;

    const lidarId = mapState.activeLidarLayer;
    const apply = () => {
      if (instance.getLayer('lidar-layer')) instance.removeLayer('lidar-layer');
      if (instance.getSource('lidar-raster')) instance.removeSource('lidar-raster');
      if (!lidarId) return;
      const def = LIDAR_LAYERS[lidarId];
      if (!def) return;

      initPMTilesProtocol(); // idempotent — nécessaire si MapView monté hors AppShell
      instance.addSource('lidar-raster', {
        ...createPMTilesSource(def.pmtilesUrl),
        attribution: def.attribution,
      });
      // Au-dessus des rasters (fond + historique), sous les couches vectorielles
      const firstNonRaster = instance.getStyle().layers.find((l) => l.type !== 'raster')?.id;
      instance.addLayer(
        {
          id: 'lidar-layer',
          type: 'raster',
          source: 'lidar-raster',
          paint: { 'raster-opacity': mapState.lidarOpacity },
        },
        firstNonRaster
      );
    };

    whenStyleReady(instance, apply);
    // l'opacité a son propre effet, comme pour la couche historique
  }, [mapInstance, mapState.activeLidarLayer]);

  // Mettre à jour l'opacité de la couche LiDAR
  useEffect(() => {
    if (!mapInstance || !mapState.activeLidarLayer) return;
    if (!mapInstance.getLayer('lidar-layer')) return;
    mapInstance.setPaintProperty('lidar-layer', 'raster-opacity', mapState.lidarOpacity);
  }, [mapInstance, mapState.lidarOpacity, mapState.activeLidarLayer]);

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

  const handleLidarLayerChange = (layerId: LidarLayerId | null) => {
    setMapState((prev) => ({ ...prev, activeLidarLayer: layerId }));
  };

  const handleLidarOpacityChange = (opacity: number) => {
    const clamped = Math.max(0, Math.min(1, opacity));
    setMapState((prev) => ({ ...prev, lidarOpacity: clamped }));
  };

  // Notify parent of cell selection
  useEffect(() => {
    onScoredCellSelected?.(selectedCell);
  }, [selectedCell, onScoredCellSelected]);

  const activeLayerCount = (mapState.activeHistoricLayer ? 1 : 0) + (mapState.activeLidarLayer ? 1 : 0);

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
        {mapInstance && <TargetsLayer map={mapInstance} />}

        {/* Attribution — pastille discrète sur la carte */}
        <div
          style={{
            position: 'absolute',
            left: '10px',
            bottom: '8px',
            zIndex: 10,
            padding: '3px 9px',
            borderRadius: 'var(--radius-pill)',
            background: 'oklch(20% 0.018 265 / 0.75)',
            color: 'var(--td-chrome-ink-soft)',
            fontSize: '0.62rem',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {zoneConfig.name} · © IGN · z{Math.round(mapState.zoom)}
        </div>

        {/* FAB Couches + panneau flottant (mockup-terrain : la carte reste
            visible pendant qu'on règle les faders — pas de bottom-sheet) */}
        <div className="fg-spacer" style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <div className={layersOpen ? 'layers-panel is-open' : 'layers-panel'} aria-hidden={!layersOpen}>
            <div className="layers-sheet" role="dialog" aria-label="Couches de carte">
              <div className="layers-sheet-head">
                <h2 className="layers-sheet-title">Couches</h2>
                <button className="layers-sheet-close" type="button" aria-label="Fermer" onClick={() => setLayersOpen(false)}>×</button>
              </div>
              <div className="layers-sheet-body">
                <div className="layers-sheet-row">
                  <span style={{ width: '52px', flexShrink: 0 }}>Fond</span>
                  <select
                    value={mapState.baseLayer}
                    onChange={(e) => handleBaseLayerChange(e.target.value)}
                    aria-label="Fond de carte"
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

                <div className="layers-sheet-row">
                  <span style={{ width: '52px', flexShrink: 0 }}>Époque</span>
                  <select
                    value={mapState.activeHistoricLayer || ''}
                    onChange={(e) => handleHistoricLayerChange((e.target.value || null) as HistoricLayerId | null)}
                    aria-label="Couche historique"
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
                {mapState.activeHistoricLayer && (
                  <div className="layers-sheet-row">
                    <span style={{ width: '52px', flexShrink: 0, color: 'var(--td-chrome-ink-soft)' }}>Opacité</span>
                    <input
                      type="range"
                      className="layer-slider"
                      style={{ flex: 1, width: 'auto' }}
                      min="0"
                      max="100"
                      value={Math.round(mapState.historicOpacity * 100)}
                      onChange={(e) => handleOpacityChange(parseInt(e.target.value, 10) / 100)}
                      aria-label="Opacité couche historique"
                    />
                    <span className="layer-row-val">{Math.round(mapState.historicOpacity * 100)}%</span>
                  </div>
                )}

                <div className="layers-sheet-row">
                  <span style={{ width: '52px', flexShrink: 0 }}>Relief</span>
                  <select
                    value={mapState.activeLidarLayer || ''}
                    onChange={(e) => handleLidarLayerChange((e.target.value || null) as LidarLayerId | null)}
                    aria-label="Couche relief LiDAR"
                  >
                    <option value="">— Aucun —</option>
                    {LIDAR_LAYER_IDS.map((layerId) => (
                      <option key={layerId} value={layerId}>
                        {LIDAR_LAYERS[layerId]?.label ?? layerId}
                      </option>
                    ))}
                  </select>
                </div>
                {mapState.activeLidarLayer && (
                  <div className="layers-sheet-row">
                    <span style={{ width: '52px', flexShrink: 0, color: 'var(--td-chrome-ink-soft)' }}>Opacité</span>
                    <input
                      type="range"
                      className="layer-slider"
                      style={{ flex: 1, width: 'auto' }}
                      min="0"
                      max="100"
                      value={Math.round(mapState.lidarOpacity * 100)}
                      onChange={(e) => handleLidarOpacityChange(parseInt(e.target.value, 10) / 100)}
                      aria-label="Opacité relief"
                    />
                    <span className="layer-row-val">{Math.round(mapState.lidarOpacity * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            className="layers-fab"
            type="button"
            aria-label="Couches de carte"
            aria-haspopup="dialog"
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen((v) => !v)}
          >
            <span className="layers-fab-icon"><span></span><span></span><span></span></span>
            {activeLayerCount > 0 && <span className="layers-fab-badge">{activeLayerCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
