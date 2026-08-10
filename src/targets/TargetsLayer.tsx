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
import { pickHypeLine } from '../app/hype';
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

      const hypeLine = pickHypeLine(props.name);
      const html = `
        <div style="font-size: 12.5px; line-height: 1.45; max-width: 230px;">
          <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; opacity: .7;">${props.period}</div>
          <strong>${props.name}</strong>
          <div style="font-size: 11px; font-style: italic; margin-top: 4px; color: #b8860b;">« ${hypeLine} »</div>
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
        background: legendOpen ? 'var(--td-chrome)' : 'var(--td-chrome)',
        padding: legendOpen ? 'var(--space-3) var(--space-4)' : '0',
        borderRadius: legendOpen ? 'var(--radius-md)' : 'var(--radius-pill)',
        boxShadow: 'var(--shadow-ambient-lg), var(--inset-highlight)',
        zIndex: 500,
        maxWidth: '190px',
        transition: 'border-radius var(--dur-ui) ease, padding var(--dur-ui) ease',
      }}
    >
      <button
        onClick={() => setLegendOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: legendOpen ? '0 0 var(--space-2)' : '10px 16px',
          fontWeight: '800',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          color: 'var(--td-chrome-ink)',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: legendOpen ? 'flex-start' : 'center',
          gap: 'var(--space-2)',
          transition: 'color var(--dur-ui) ease',
        }}
      >
        Cibles ({featureCount}) {legendOpen ? '▾' : '▸'}
      </button>
      {legendOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            borderTop: '1px solid oklch(100% 0 0 / 0.08)',
            paddingTop: 'var(--space-2)',
          }}
        >
          {(Object.keys(CATEGORY_LABELS) as TargetCategory[]).map((cat) => (
            <div
              key={cat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: '0.72rem',
                fontWeight: '700',
                color: 'var(--td-chrome-ink-soft)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: CATEGORY_COLORS[cat],
                  border: '2px solid var(--td-chrome-ink)',
                  flex: '0 0 auto',
                  boxShadow: '0 0 0 1px oklch(0% 0 0 / 0.2)',
                }}
              />
              {CATEGORY_LABELS[cat]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TargetsLayer;
