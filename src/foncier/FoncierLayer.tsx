import { useEffect, useRef, useState } from 'react';
import { Popup } from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { loadFoncier, loadVoies } from './source';
import type { FoncierKind } from './types';

interface FoncierLayerProps {
  map: MapLibreMap | null;
  isVisible?: boolean;
}

const KIND_LABEL: Record<FoncierKind, string> = {
  bati: 'Bâti — exclu',
  foret_publique: 'Forêt publique (ONF)',
  prive_autorisation: 'Privé — autorisation requise',
};

/**
 * FoncierLayer — distingue accès public / privé sous autorisation / exclu.
 *
 * Indicatif seulement, jamais une autorisation de fait : voir le bandeau
 * légal affiché par le parent quand cette couche est active.
 */
export const FoncierLayer: React.FC<FoncierLayerProps> = ({ map, isVisible = true }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map) return;

    const initializeLayer = async () => {
      try {
        const [parcelles, voies] = await Promise.all([loadFoncier(), loadVoies()]);

        if (!map.getSource('foncier-parcelles')) {
          map.addSource('foncier-parcelles', { type: 'geojson', data: parcelles });
        } else {
          (map.getSource('foncier-parcelles') as GeoJSONSource).setData(parcelles);
        }

        if (!map.getSource('foncier-voies')) {
          map.addSource('foncier-voies', { type: 'geojson', data: voies });
        } else {
          (map.getSource('foncier-voies') as GeoJSONSource).setData(voies);
        }

        setFeatureCount(parcelles.features.length + voies.features.length);

        if (!map.getLayer('foncier-parcelles-fill')) {
          map.addLayer({
            id: 'foncier-parcelles-fill',
            type: 'fill',
            source: 'foncier-parcelles',
            paint: {
              'fill-color': [
                'match',
                ['get', 'kind'],
                'bati', '#d32f2f',
                'foret_publique', '#2e7d32',
                'prive_autorisation', '#f57c00',
                '#9e9e9e',
              ],
              'fill-opacity': 0.18,
            },
          });
        }

        if (!map.getLayer('foncier-parcelles-outline')) {
          map.addLayer({
            id: 'foncier-parcelles-outline',
            type: 'line',
            source: 'foncier-parcelles',
            paint: {
              'line-color': [
                'match',
                ['get', 'kind'],
                'bati', '#d32f2f',
                'foret_publique', '#2e7d32',
                'prive_autorisation', '#f57c00',
                '#9e9e9e',
              ],
              'line-width': 1,
            },
          });
        }

        if (!map.getLayer('foncier-voies-line')) {
          map.addLayer({
            id: 'foncier-voies-line',
            type: 'line',
            source: 'foncier-voies',
            paint: {
              'line-color': ['case', ['==', ['get', 'prive'], true], '#d32f2f', '#2e7d32'],
              'line-width': 2,
            },
          });
        }

        map.on('click', 'foncier-parcelles-fill', handleParcelleClick);
        map.on('click', 'foncier-voies-line', handleVoieClick);
        map.on('mouseenter', 'foncier-parcelles-fill', handleMouseEnter);
        map.on('mouseleave', 'foncier-parcelles-fill', handleMouseLeave);
        map.on('mouseenter', 'foncier-voies-line', handleMouseEnter);
        map.on('mouseleave', 'foncier-voies-line', handleMouseLeave);

        setIsLoaded(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message);
        console.error('Erreur chargement foncier:', err);
      }
    };

    const showPopup = (e: MapLayerMouseEvent, html: string) => {
      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new Popup({ closeButton: true, offset: 12 }).setLngLat(e.lngLat).setHTML(html).addTo(map);
    };

    const handleParcelleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const kind = feature.properties?.kind as FoncierKind;
      const section = feature.properties?.section;
      const numero = feature.properties?.numero;
      showPopup(
        e,
        `<div style="font-size: 12px; min-width: 180px;">
          <strong>${KIND_LABEL[kind] ?? kind}</strong><br/>
          ${section ? `<span style="color: #666;">Section ${section}${numero ? ` n°${numero}` : ''}</span><br/>` : ''}
          <span style="color: #999; font-size: 11px;">Indicatif — pas une autorisation. Accord du propriétaire requis en privé.</span>
        </div>`
      );
    };

    const handleVoieClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const nature = feature.properties?.nature;
      const nom = feature.properties?.nom;
      const prive = feature.properties?.prive;
      showPopup(
        e,
        `<div style="font-size: 12px; min-width: 180px;">
          <strong>${nom || nature || 'Voie'}</strong><br/>
          <span style="color: #666;">${nature ?? ''}</span><br/>
          <span style="color: ${prive ? '#d32f2f' : '#2e7d32'};">${prive ? 'Voie privée' : 'Voie publique'}</span>
        </div>`
      );
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    // `isStyleLoaded()` + `once('load')` (pattern ZonesLayer) casse silencieusement
    // ici : cette couche se monte tard, après un toggle utilisateur — l'event
    // 'load' de la carte est déjà consommé depuis longtemps et ne refire jamais,
    // et isStyleLoaded() peut rester faux tant qu'une source annexe charge encore
    // (cf. commentaire whenStyleReady dans MapView.tsx). Même logique ici.
    if (map.getStyle()) {
      initializeLayer();
    } else {
      const onStyleData = () => {
        if (!map.getStyle()) return;
        map.off('styledata', onStyleData);
        initializeLayer();
      };
      map.on('styledata', onStyleData);
    }

    return () => {
      if (popupRef.current) popupRef.current.remove();
      map.off('click', 'foncier-parcelles-fill', handleParcelleClick);
      map.off('click', 'foncier-voies-line', handleVoieClick);
      map.off('mouseenter', 'foncier-parcelles-fill', handleMouseEnter);
      map.off('mouseleave', 'foncier-parcelles-fill', handleMouseLeave);
      map.off('mouseenter', 'foncier-voies-line', handleMouseEnter);
      map.off('mouseleave', 'foncier-voies-line', handleMouseLeave);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const layers = ['foncier-parcelles-fill', 'foncier-parcelles-outline', 'foncier-voies-line'];
    for (const id of layers) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
      }
    }
  }, [map, isVisible]);

  return (
    <div data-testid="foncier-layer" style={{ display: 'none' }}>
      {isLoaded && <div data-testid="foncier-loaded">{featureCount} entité(s) foncier chargée(s)</div>}
      {error && (
        <div data-testid="foncier-error" style={{ color: 'red' }}>
          {error}
        </div>
      )}
    </div>
  );
};
