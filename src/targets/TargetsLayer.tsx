/**
 * TargetsLayer — points de cibles archéologiques nommées (docs/zone/CIBLES.md)
 *
 * Distinct du heatmap H3 du scoring (ScoringLayer) : le heatmap explique un
 * score algorithmique par critère générique (même texte pour toute cellule
 * touchée par ce critère). Cette couche affiche des cibles nommées et
 * individuellement sourcées, chacune avec l'objet réellement recherché.
 */
import { useEffect, useRef, useState } from 'react';
import { Popup } from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { loadTargets } from './source';
import type { TargetCategory, TargetProperties } from './types';

const CATEGORY_COLORS: Record<TargetCategory, string> = {
  major: '#e0402e',
  forti: '#e6892b',
  voie: '#9b6dff',
  habitat: '#d9b23a',
  repere: '#7fb2d6',
};

const CATEGORY_LABELS: Record<TargetCategory, string> = {
  major: 'Sites majeurs',
  forti: 'Fortifié / religieux',
  voie: 'Voie ancienne',
  habitat: 'Habitat / indices',
  repere: 'Repères',
};

interface TargetsLayerProps {
  map: MapLibreMap | null;
  isVisible?: boolean;
}

export const TargetsLayer: React.FC<TargetsLayerProps> = ({ map, isVisible = true }) => {
  const [featureCount, setFeatureCount] = useState(0);
  // Légende repliée par défaut sur téléphone : dépliée elle mange 1/3 de la carte
  const [legendOpen, setLegendOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 600);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map) return;

    const initializeLayer = async () => {
      const geojson = await loadTargets();

      if (!map.getSource('targets')) {
        map.addSource('targets', { type: 'geojson', data: geojson });
      } else {
        (map.getSource('targets') as GeoJSONSource).setData(geojson);
      }
      setFeatureCount(geojson.features.length);

      if (!map.getLayer('targets-points')) {
        map.addLayer({
          id: 'targets-points',
          type: 'circle',
          source: 'targets',
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match',
              ['get', 'category'],
              'major', CATEGORY_COLORS.major,
              'forti', CATEGORY_COLORS.forti,
              'voie', CATEGORY_COLORS.voie,
              'habitat', CATEGORY_COLORS.habitat,
              'repere', CATEGORY_COLORS.repere,
              '#999',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });
      }

      map.on('click', 'targets-points', handleClick);
      map.on('mouseenter', 'targets-points', handleMouseEnter);
      map.on('mouseleave', 'targets-points', handleMouseLeave);
    };

    const handleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as unknown as TargetProperties;

      const html = `
        <div style="font-size: 12.5px; line-height: 1.45; max-width: 230px;">
          <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; opacity: .7;">${props.period}</div>
          <strong>${props.name}</strong>
          ${props.find ? `<br/><strong>À chercher :</strong> ${props.find}` : ''}
          <div style="font-size: 10.5px; opacity: .7; margin-top: 4px;">${props.justification}</div>
        </div>
      `;

      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new Popup({ closeButton: true, offset: 12 })
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

    if (map.isStyleLoaded()) {
      initializeLayer();
    } else {
      map.once('load', initializeLayer);
    }

    return () => {
      popupRef.current?.remove();
      map.off('click', 'targets-points', handleClick);
      map.off('mouseenter', 'targets-points', handleMouseEnter);
      map.off('mouseleave', 'targets-points', handleMouseLeave);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !map.getLayer('targets-points')) return;
    map.setLayoutProperty('targets-points', 'visibility', isVisible ? 'visible' : 'none');
  }, [map, isVisible]);

  if (featureCount === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        background: '#fff',
        padding: legendOpen ? '10px 12px' : '0',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 500,
        fontSize: '12px',
        maxWidth: '190px',
      }}
    >
      <button
        onClick={() => setLegendOpen((v) => !v)}
        style={{
          display: 'block',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: legendOpen ? '0 0 6px' : '10px 12px',
          fontWeight: 'bold',
          fontSize: '12px',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        Cibles ({featureCount}) {legendOpen ? '▾' : '▸'}
      </button>
      {legendOpen &&
        (Object.keys(CATEGORY_LABELS) as TargetCategory[]).map((cat) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: CATEGORY_COLORS[cat],
                border: '1px solid #fff',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                flex: '0 0 auto',
              }}
            />
            {CATEGORY_LABELS[cat]}
          </div>
        ))}
    </div>
  );
};

export default TargetsLayer;
