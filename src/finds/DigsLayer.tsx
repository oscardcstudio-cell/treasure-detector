/**
 * DigsLayer — affiche les creusages/trouvailles enregistrés sur la carte.
 * Couleur par résultat : rien (gris), ferraille (brun), trouvaille (ambre).
 * Se rafraîchit quand refreshKey change (nouvel enregistrement).
 */

import { useEffect, useRef } from 'react';
import { Popup } from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { getDatabase } from '../db/schema';

const OUTCOME_LABELS: Record<string, string> = {
  rien: 'Rien trouvé',
  ferraille: 'Ferraille',
  trouvaille: 'Trouvaille',
};

interface DigsLayerProps {
  map: MapLibreMap | null;
  refreshKey: number;
}

export const DigsLayer: React.FC<DigsLayerProps> = ({ map, refreshKey }) => {
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;

    const apply = async () => {
      const db = getDatabase();
      const [digs, finds] = await Promise.all([db.digPoints.toArray(), db.finds.toArray()]);
      if (cancelled) return;
      const findByDig = new Map(finds.filter((f) => !f.deleted).map((f) => [f.digPointId, f]));

      const geojson = {
        type: 'FeatureCollection' as const,
        features: digs
          .filter((d) => !d.deleted)
          .map((d) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: d.coord },
            properties: {
              outcome: d.outcome,
              at: d.at,
              note: d.note ?? '',
              findCategory: findByDig.get(d.id)?.category ?? '',
              findDescription: findByDig.get(d.id)?.description ?? '',
            },
          })),
      };

      if (!map.getSource('digs')) {
        map.addSource('digs', { type: 'geojson', data: geojson });
      } else {
        (map.getSource('digs') as GeoJSONSource).setData(geojson);
      }

      if (!map.getLayer('digs-points')) {
        map.addLayer({
          id: 'digs-points',
          type: 'circle',
          source: 'digs',
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'match',
              ['get', 'outcome'],
              'rien', '#9e9e9e',
              'ferraille', '#8d6e63',
              'trouvaille', '#ffb300',
              '#9e9e9e',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#1a1a1a',
          },
        });
        map.on('click', 'digs-points', handleClick);
      }
    };

    const handleClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, string>;
      const when = p.at ? new Date(p.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      const outcome = p.outcome ?? '';
      const html = `
        <div style="font-size: 12.5px; line-height: 1.45; max-width: 220px;">
          <strong>${OUTCOME_LABELS[outcome] ?? outcome}</strong>
          <div style="font-size: 11px; opacity: .7;">${when}</div>
          ${p.findCategory ? `<div style="margin-top: 4px;">Objet : <strong>${p.findCategory}</strong></div>` : ''}
          ${p.findDescription ? `<div style="font-size: 11.5px; margin-top: 2px;">${p.findDescription}</div>` : ''}
          ${p.note ? `<div style="font-size: 11.5px; margin-top: 2px; font-style: italic;">${p.note}</div>` : ''}
        </div>
      `;
      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new Popup({ closeButton: true, offset: 10 }).setLngLat(e.lngLat).setHTML(html).addTo(map);
    };

    if (map.isStyleLoaded()) {
      void apply();
    } else {
      map.once('load', () => void apply());
    }

    return () => {
      cancelled = true;
      popupRef.current?.remove();
    };
  }, [map, refreshKey]);

  return null;
};

export default DigsLayer;
