import { useEffect, useState, useRef } from 'react';
import { Popup } from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { loadSignaledZones } from './source';
import type { SignaledZone } from './types';

interface ZonesLayerProps {
  map: MapLibreMap | null;
  isVisible?: boolean;
}

export const ZonesLayer: React.FC<ZonesLayerProps> = ({
  map,
  isVisible = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map) return;

    const initializeLayer = async () => {
      try {
        const geojson = await loadSignaledZones();

        // Créer la source GeoJSON
        if (!map.getSource('zones-signalees')) {
          map.addSource('zones-signalees', {
            type: 'geojson',
            data: geojson,
          });
        } else {
          const source = map.getSource('zones-signalees') as GeoJSONSource;
          source.setData(geojson);
        }

        setFeatureCount(geojson.features.length);

        // Ajouter les couches de rendu si absent
        if (!map.getLayer('zones-signalees-fill')) {
          map.addLayer({
            id: 'zones-signalees-fill',
            type: 'fill',
            source: 'zones-signalees',
            paint: {
              'fill-color': '#ff9800',
              'fill-opacity': 0.1,
            },
          });
        }

        if (!map.getLayer('zones-signalees-outline')) {
          map.addLayer({
            id: 'zones-signalees-outline',
            type: 'line',
            source: 'zones-signalees',
            paint: {
              'line-color': '#ff9800',
              'line-width': 2,
              'line-dasharray': [4, 4],
            },
          });
        }

        // Handler pour afficher popup au tap
        map.on('click', 'zones-signalees-fill', handleClick);
        map.on('mouseenter', 'zones-signalees-fill', handleMouseEnter);
        map.on('mouseleave', 'zones-signalees-fill', handleMouseLeave);

        setIsLoaded(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message);
        console.error('Erreur chargement zones signalées:', err);
      }
    };

    const handleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as unknown as SignaledZone['properties'];
      const { name, kind, source, ref, description } = props;

      const html = `
        <div style="font-size: 12px; min-width: 200px;">
          <strong>${name}</strong><br/>
          <span style="color: #666;">Type: ${kind}</span><br/>
          ${ref ? `<span style="color: #666;">Ref: ${ref}</span><br/>` : ''}
          <span style="color: #999; font-size: 11px;">Source: ${source}</span>
          ${description ? `<br/><p style="margin: 4px 0; font-size: 11px;">${description}</p>` : ''}
        </div>
      `;

      if (popupRef.current) {
        popupRef.current.remove();
      }

      popupRef.current = new Popup({ closeButton: true, offset: 25 })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    // addSource/addLayer avant la fin du chargement du style lève
    // « Style is not done loading » et casse le montage de la carte.
    if (map.isStyleLoaded()) {
      initializeLayer();
    } else {
      map.once('load', initializeLayer);
    }

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
      map.off('click', 'zones-signalees-fill', handleClick);
      map.off('mouseenter', 'zones-signalees-fill', handleMouseEnter);
      map.off('mouseleave', 'zones-signalees-fill', handleMouseLeave);
    };
  }, [map]);

  // Contrôler la visibilité des couches
  useEffect(() => {
    if (!map) return;

    if (map.getLayer('zones-signalees-fill')) {
      map.setLayoutProperty('zones-signalees-fill', 'visibility', isVisible ? 'visible' : 'none');
    }
    if (map.getLayer('zones-signalees-outline')) {
      map.setLayoutProperty('zones-signalees-outline', 'visibility', isVisible ? 'visible' : 'none');
    }
  }, [map, isVisible]);

  return (
    <div data-testid="zones-layer" style={{ display: 'none' }}>
      {isLoaded && <div data-testid="zones-loaded">{featureCount} zone(s) chargée(s)</div>}
      {error && (
        <div data-testid="zones-error" style={{ color: 'red' }}>
          {error}
        </div>
      )}
    </div>
  );
};
