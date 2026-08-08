/**
 * MapContext — shared reference to the MapLibre instance
 * Allows child components to access and modify the map
 */

import React, { createContext, useContext } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';

interface MapContextType {
  map: MapLibreMap | null;
  setMap: (map: MapLibreMap | null) => void;
}

const MapContext = createContext<MapContextType | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = React.useState<MapLibreMap | null>(null);

  return (
    <MapContext.Provider value={{ map, setMap }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used inside <MapProvider>');
  }
  return context;
}
