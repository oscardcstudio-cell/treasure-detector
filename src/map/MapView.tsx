import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import zoneConfig from '../../config/zone.json';
import { LAYERS, BASEMAP_DEFAULTS, HistoricLayerId } from './layers';

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

/**
 * MapView — Carte principale centrée sur la zone
 * - Sélection de fond (Plan IGN / Ortho)
 * - Superposition de couche historique avec opacité réglable
 * - Slider de comparaison (rideau) pour avant/après
 * - Persistance de l'état dans localStorage
 */
export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);

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

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current) return;

    const baseLayerDef = LAYERS[mapState.baseLayer as keyof typeof LAYERS];
    if (!baseLayerDef) return;

    // Construire le style MapLibre
    const style: StyleSpecification = {
      version: 8,
      sources: {
        'base-raster': {
          type: 'raster',
          tiles: [baseLayerDef.url],
          tileSize: 256,
          attribution: baseLayerDef.attribution,
        },
        ...(mapState.activeHistoricLayer && {
          'historic-raster': {
            type: 'raster',
            tiles: [LAYERS[mapState.activeHistoricLayer as keyof typeof LAYERS]!.url],
            tileSize: 256,
            attribution: LAYERS[mapState.activeHistoricLayer as keyof typeof LAYERS]!.attribution,
          },
        }),
      },
      layers: mapState.activeHistoricLayer
        ? [
            {
              id: 'base-layer',
              type: 'raster' as const,
              source: 'base-raster',
              minzoom: baseLayerDef.minZoom,
              maxzoom: 24,
            },
            {
              id: 'historic-layer',
              type: 'raster' as const,
              source: 'historic-raster',
              minzoom: LAYERS[mapState.activeHistoricLayer as keyof typeof LAYERS]!.minZoom,
              maxzoom: 24,
              paint: {
                'raster-opacity': mapState.historicOpacity,
              },
            },
          ]
        : [
            {
              id: 'base-layer',
              type: 'raster' as const,
              source: 'base-raster',
              minzoom: baseLayerDef.minZoom,
              maxzoom: 24,
            },
          ],
    };

    map.current = new MapLibreMap({
      container: mapContainer.current,
      style,
      center: mapState.center,
      zoom: mapState.zoom,
      pitch: mapState.pitch,
      bearing: mapState.bearing,
      attributionControl: false,
    });

    // Ajouter les contrôles
    map.current.addControl(new NavigationControl(), 'top-right');

    // Mise à jour de l'état à chaque changement de vue
    const onMove = () => {
      if (!map.current) return;
      setMapState((prev) => ({
        ...prev,
        center: map.current!.getCenter().toArray() as [number, number],
        zoom: map.current!.getZoom(),
        pitch: map.current!.getPitch(),
        bearing: map.current!.getBearing(),
      }));
    };

    map.current.on('move', onMove);

    return () => {
      map.current?.off('move', onMove);
      map.current?.remove();
    };
  }, [mapState.baseLayer, mapState.activeHistoricLayer, mapState.historicOpacity, mapState.center, mapState.zoom, mapState.pitch, mapState.bearing]);

  // Mettre à jour l'opacité de la couche historique
  useEffect(() => {
    if (!map.current || !mapState.activeHistoricLayer) return;
    map.current.setPaintProperty('historic-layer', 'raster-opacity', mapState.historicOpacity);
  }, [mapState.historicOpacity, mapState.activeHistoricLayer]);

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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Carte */}
      <div style={{ flex: 1, position: 'relative' }} ref={mapContainer} />

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
