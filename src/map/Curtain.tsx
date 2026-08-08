import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import zoneConfig from '../../config/zone.json';
import { LAYERS, HistoricLayerId } from './layers';

interface CurtainProps {
  layerLeft: HistoricLayerId;    // Couche affichée à gauche
  layerRight: HistoricLayerId;   // Couche affichée à droite
  center?: [number, number];
  zoom?: number;
}

/**
 * Curtain — Rideau vertical de comparaison entre deux couches historiques
 *
 * Implémentation :
 * - Deux instances MapLibre synchronisées (même view state)
 * - Slider vertical au doigt
 * - Clip-path CSS pour masquer/afficher chaque moitié
 * - Responsive mobile et desktop
 */
export default function Curtain({ layerLeft, layerRight, center, zoom }: CurtainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftMapRef = useRef<HTMLDivElement>(null);
  const rightMapRef = useRef<HTMLDivElement>(null);

  const mapLeftRef = useRef<MapLibreMap | null>(null);
  const mapRightRef = useRef<MapLibreMap | null>(null);

  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const defaultCenter = (center || zoneConfig.center) as [number, number];
  const defaultZoom = zoom || zoneConfig.defaultZoom;

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALISATION DES CARTES
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const initMap = (
      container: HTMLDivElement | null,
      layerId: HistoricLayerId,
      mapRef: React.MutableRefObject<MapLibreMap | null>,
    ) => {
      if (!container) return;

      const layerDef = LAYERS[layerId as keyof typeof LAYERS];
      if (!layerDef) return;

      const style: StyleSpecification = {
        version: 8,
        sources: {
          'raster': {
            type: 'raster',
            tiles: [layerDef.url],
            tileSize: 256,
            attribution: layerDef.attribution,
          },
        },
        layers: [
          {
            id: 'raster-layer',
            type: 'raster',
            source: 'raster',
            minzoom: layerDef.minZoom,
            maxzoom: 24,
          },
        ],
      };

      mapRef.current = new MapLibreMap({
        container,
        style,
        center: defaultCenter,
        zoom: defaultZoom,
        pitch: 0,
        bearing: 0,
        attributionControl: false, // Géré manuellement
      });

      mapRef.current.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    };

    if (leftMapRef.current) {
      leftMapRef.current.remove();
    }
    if (rightMapRef.current) {
      rightMapRef.current.remove();
    }

    initMap(leftMapRef.current, layerLeft, mapLeftRef);
    initMap(rightMapRef.current, layerRight, mapRightRef);

    return () => {
      mapLeftRef.current?.remove();
      mapRightRef.current?.remove();
    };
  }, [layerLeft, layerRight, defaultCenter, defaultZoom]);

  // ═══════════════════════════════════════════════════════════════════════
  // SYNCHRONISATION DES VUES
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const mapLeft = mapLeftRef.current;
    const mapRight = mapRightRef.current;

    if (!mapLeft || !mapRight) return;

    const syncMapState = (source: MapLibreMap, target: MapLibreMap) => {
      target.jumpTo({
        center: source.getCenter(),
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch(),
      });
    };

    const onLeftMove = () => {
      if (mapLeft && mapRight) {
        syncMapState(mapLeft, mapRight);
      }
    };

    const onRightMove = () => {
      if (mapLeft && mapRight) {
        syncMapState(mapRight, mapLeft);
      }
    };

    mapLeft.on('move', onLeftMove);
    mapRight.on('move', onRightMove);

    return () => {
      mapLeft.off('move', onLeftMove);
      mapRight.off('move', onRightMove);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // GESTION DU SLIDER
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newPos = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      setSliderPos(newPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Gestion du touch
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      const container = containerRef.current;
      const touch = e.touches[0];
      if (!container || !touch) return;

      const rect = container.getBoundingClientRect();
      const newPos = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      setSliderPos(newPos);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Carte de gauche */}
      <div
        ref={leftMapRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          clipPath: `polygon(0% 0%, ${sliderPos}% 0%, ${sliderPos}% 100%, 0% 100%)`,
        }}
      />

      {/* Carte de droite */}
      <div
        ref={rightMapRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          clipPath: `polygon(${sliderPos}% 0%, 100% 0%, 100% 100%, ${sliderPos}% 100%)`,
        }}
      />

      {/* Slider — ligne verticale avec poignée */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${sliderPos}%`,
          width: '2px',
          height: '100%',
          background: '#fff',
          boxShadow: '0 0 8px rgba(0,0,0,0.3)',
          transform: 'translateX(-50%)',
          zIndex: 10,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />

      {/* Poignée draggable */}
      <div
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={handleTouchStart}
        style={{
          position: 'absolute',
          top: '50%',
          left: `${sliderPos}%`,
          transform: 'translate(-50%, -50%)',
          width: '40px',
          height: '40px',
          background: '#fff',
          border: '2px solid #999',
          borderRadius: '50%',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 11,
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '16px', color: '#666' }}>◀ ▶</span>
      </div>

      {/* Étiquettes de couche */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {LAYERS[layerLeft as keyof typeof LAYERS]?.label || layerLeft}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {LAYERS[layerRight as keyof typeof LAYERS]?.label || layerRight}
      </div>

      {/* Pied de page — attribution + position slider */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          background: 'rgba(255,255,255,0.9)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <span>© IGN</span>
        <span>{Math.round(sliderPos)}%</span>
      </div>
    </div>
  );
}
