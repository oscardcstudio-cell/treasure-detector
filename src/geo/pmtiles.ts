/**
 * Intégration PMTiles dans MapLibre GL
 *
 * Enregistre le protocole pmtiles:// pour que MapLibre puisse charger
 * les fichiers PMTiles depuis data/derived/ ou des URLs distantes.
 *
 * Usage dans la couche MapLibre :
 *   source: {
 *     type: 'vector',
 *     url: 'pmtiles://./data/derived/hillshade.pmtiles'
 *   }
 */

import type { Map } from 'maplibre-gl';

// Instance globale du protocole PMTiles (non utilisée dans cette impl simplifiée)
let pmtilesInitialized = false;

/**
 * Initialiser le protocole pmtiles:// pour une instance MapLibre
 * Doit être appelé une seule fois, avant de charger des sources PMTiles
 *
 * Note : maplibre-gl ne dispose pas nativement de support PMTiles.
 * Cette fonction est un placeholder pour futur support ou
 * un wrapper autour d'une lib PMTiles externe.
 */
export function initPMTilesProtocol(mapInstance: Map): void {
  if (pmtilesInitialized) {
    return; // Déjà initialisé
  }

  // Register protocol if maplibre supports it (depends on version)
  // For now, this is a stub that can be extended with actual PMTiles support
  // via a library like @protomaps/pmtiles
  try {
    // Cast to any to access extensions not in standard MapLibre types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extendedMap = mapInstance as unknown as any;
    if (typeof extendedMap?.addProtocol === 'function') {
      extendedMap.addProtocol(
        'pmtiles',
        async (request: Record<string, string>): Promise<{ data: ArrayBuffer }> => {
          const urlString = request.url || '';
          const url = urlString.replace('pmtiles://', './');
          const response = await fetch(url, {
            headers: {
              'Range': 'bytes=0-262143', // PMTiles header size
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${urlString}`);
          }

          const data = await response.arrayBuffer();
          return { data };
        }
      );
    }
    pmtilesInitialized = true;
  } catch (error) {
    console.warn('PMTiles protocol initialization failed (may not be supported):', error);
  }
}

/**
 * Helper : créer une source MapLibre pour un fichier PMTiles
 * Le fichier peut être local (./data/derived/xxx.pmtiles) ou distant
 */
export function createPMTilesSource(
  pmtilesUrl: string
): {
  type: 'vector' | 'raster';
  url: string;
} {
  const url = pmtilesUrl.startsWith('http')
    ? pmtilesUrl
    : `pmtiles://${pmtilesUrl}`;

  // Pour les rasters (hillshade) vs vecteurs, le type est habituellement 'raster'
  // Mais MapLibre détermine ça à partir du contenu du PMTiles
  return {
    type: 'raster',
    url,
  };
}

/**
 * Vérifier si un fichier PMTiles existe et est accessible
 */
export async function checkPMTilesAvailable(pmtilesUrl: string): Promise<boolean> {
  try {
    const response = await fetch(pmtilesUrl.startsWith('http') ? pmtilesUrl : `./${pmtilesUrl}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Charger les métadonnées d'un PMTiles (zoom min/max, bounds, etc.)
 * Utile pour savoir quels zooms couvre un PMTiles avant de l'ajouter à la carte
 *
 * Note : implémentation simplifiée. Pour parsing complet du header PMTiles,
 * utiliser la librairie pmtiles directement.
 */
export async function getPMTilesMetadata(pmtilesUrl: string): Promise<{
  minZoom: number;
  maxZoom: number;
  bounds?: [number, number, number, number];
  center?: [number, number, number];
  type?: string;
} | null> {
  try {
    const response = await fetch(pmtilesUrl.startsWith('http') ? pmtilesUrl : `./${pmtilesUrl}`, {
      headers: {
        'Range': 'bytes=0-16383', // Les métadonnées sont en début de fichier
      },
    });

    if (!response.ok) {
      return null;
    }

    // Parsing basique du header PMTiles (pas complet)
    // Format : header de 127 bytes, puis metadata JSON en gzip
    // Pour une impl complète, utiliser la librairie pmtiles directement
    await response.arrayBuffer();

    // Pour l'instant, retourner des defaults prudents
    return {
      minZoom: 0,
      maxZoom: 14,
    };
  } catch (_error) {
    // Silencieux en cas d'erreur (fichier absent, etc.)
    return null;
  }
}

export {};
