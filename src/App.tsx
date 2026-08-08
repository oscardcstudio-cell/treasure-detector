import { useEffect, useRef } from 'react';
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import zoneConfig from '../config/zone.json';

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on zone
    map.current = new MapLibreMap({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'ign-plan': {
            type: 'raster',
            tiles: [
              'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'ign-plan-layer',
            type: 'raster',
            source: 'ign-plan',
            minzoom: 0,
            maxzoom: 18,
          },
        ],
      },
      center: zoneConfig.center as [number, number],
      zoom: zoneConfig.defaultZoom,
      pitch: 0,
      bearing: 0,
    });

    // Add controls
    map.current.addControl(new NavigationControl(), 'top-right');

    // Add IGN attribution
    const attr = map.current.getCanvas().parentElement?.querySelector('.maplibregl-ctrl-attrib');
    if (attr) {
      const link = document.createElement('a');
      link.href = 'https://www.ign.fr/';
      link.textContent = 'IGN';
      attr.appendChild(link);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }} ref={mapContainer} />
      <div
        style={{
          padding: '8px',
          background: '#fff',
          borderTop: '1px solid #ccc',
          fontSize: '12px',
          color: '#666',
        }}
      >
        {zoneConfig.name} • IGN
      </div>
    </div>
  );
}
