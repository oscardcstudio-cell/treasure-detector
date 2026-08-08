/**
 * Téléchargement offline des tuiles WMTS IGN
 *
 * Parcours la pyramide de tuiles z12→z18 sur la bbox fournie,
 * estime la taille avant de lancer, affiche progression et annulation.
 * Les tuiles sont mises en cache pour que le SW les serve hors ligne.
 */

import { LAYERS } from '../map/layers';
import type { TileDownloadOptions, TileEstimate, DownloadProgress, CacheQuotaInfo } from './types';

/**
 * Mercator Web (EPSG:3857) : convertir LonLat WGS84 en tuiles x,y
 */
function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Énumérer toutes les tuiles dans une bbox et une plage de zooms
 */
export function enumerateTiles(
  bbox: [number, number, number, number],
  minZoom: number,
  maxZoom: number
): Array<{ z: number; x: number; y: number }> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const tiles: Array<{ z: number; x: number; y: number }> = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const topLeft = lngLatToTile(minLng, maxLat, z);
    const bottomRight = lngLatToTile(maxLng, minLat, z);

    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      for (let x = topLeft.x; x <= bottomRight.x; x++) {
        tiles.push({ z, x, y });
      }
    }
  }

  return tiles;
}

/**
 * Estimer le nombre de tuiles et la taille approximative
 */
export function estimateTileDownload(options: TileDownloadOptions): TileEstimate {
  // Énumérer toutes les tuiles (coûteux mais exact)
  const tiles = enumerateTiles(options.bbox, options.minZoom, options.maxZoom);

  // Heuristique : moyenne 50 KB par tuile (JPEG ~40KB, PNG ~80KB)
  const avgSizeKb = 50;
  const totalTiles = tiles.length;
  const estimatedSizeMb = (totalTiles * avgSizeKb) / 1024;

  return {
    totalTiles,
    estimatedSizeMb,
    avgSizeKb,
  };
}

/**
 * Obtenir le quota de stockage disponible
 */
export async function getCacheQuotaInfo(): Promise<CacheQuotaInfo> {
  try {
    if (!navigator.storage?.estimate) {
      return {
        quota: 0,
        usage: 0,
        available: 0,
        percentUsed: 0,
      };
    }

    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const available = Math.max(0, quota - usage);
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      quota,
      usage,
      available,
      percentUsed,
    };
  } catch (error) {
    console.error('Failed to get cache quota:', error);
    return {
      quota: 0,
      usage: 0,
      available: 0,
      percentUsed: 0,
    };
  }
}

/**
 * Demander au SW l'état du cache via postMessage
 */
export function queryCacheQuotaFromSW(): Promise<{ usage: number; tileCacheSize: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker?.controller) {
      reject(new Error('Service Worker not active'));
      return;
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent) => {
      if (event.data.type === 'CACHE_QUOTA_INFO') {
        resolve({
          usage: event.data.usage || 0,
          tileCacheSize: event.data.tileCacheSize || 0,
        });
      } else if (event.data.type === 'ERROR') {
        reject(new Error(event.data.error));
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'CACHE_QUOTA_INFO' },
      [channel.port2]
    );
  });
}

/**
 * Télécharger les tuiles pour une ou plusieurs couches
 * Retourne un observable-like objet pour la progression
 */
export async function downloadTiles(options: TileDownloadOptions): Promise<void> {
  // Valider les paramètres
  if (!options.layerIds || options.layerIds.length === 0) {
    throw new Error('No layers specified');
  }

  for (const layerId of options.layerIds) {
    if (!LAYERS[layerId]) {
      throw new Error(`Layer not found: ${layerId}`);
    }
  }

  if (options.minZoom > options.maxZoom) {
    throw new Error('minZoom must be <= maxZoom');
  }

  // Énumérer toutes les tuiles
  const allTiles = enumerateTiles(options.bbox, options.minZoom, options.maxZoom);
  const totalRequests = allTiles.length * options.layerIds.length;

  let downloaded = 0;
  let bytesDownloaded = 0;

  for (const layerId of options.layerIds) {
    const layer = LAYERS[layerId];
    if (!layer) {
      throw new Error(`Layer not found: ${layerId}`);
    }

    const cache = await caches.open('ign-tiles-v1');

    for (const tile of allTiles) {
      if (options.signal?.aborted) {
        throw new Error('Download cancelled');
      }

      // Construire l'URL de la tuile (remplacer {z}, {x}, {y})
      const url = layer.url
        .replace('{z}', String(tile.z))
        .replace('{x}', String(tile.x))
        .replace('{y}', String(tile.y));

      try {
        const request = new Request(url);
        const cached = await cache.match(request);

        // Sauter si déjà en cache
        if (cached) {
          downloaded++;
          const cachedBlob = await cached.clone().blob();
          bytesDownloaded += cachedBlob.size;
        } else {
          // Fetch et mettre en cache
          const response = await fetch(url, {
            signal: options.signal,
            headers: {
              'Accept-Encoding': 'gzip, deflate',
            },
          });

          if (response.ok) {
            await cache.put(request, response.clone());
            const blob = await response.blob();
            bytesDownloaded += blob.size;
          }

          downloaded++;
        }

        // Callback progression
        if (options.onProgress) {
          const progress: DownloadProgress = {
            downloaded,
            total: totalRequests,
            percent: Math.round((downloaded / totalRequests) * 100),
            bytesDownloaded,
            bytesEstimated: totalRequests * 50 * 1024, // 50 KB par tuile
          };
          options.onProgress(progress.downloaded, progress.total);
        }
      } catch (error) {
        // Continuer même si une tuile échoue (réseau intermittent)
        downloaded++;
        console.warn(`Failed to download tile ${layerId} z${tile.z} x${tile.x} y${tile.y}:`, error);
      }
    }
  }
}

/**
 * Vider complètement le cache des tuiles
 */
export async function clearTileCache(): Promise<void> {
  await caches.delete('ign-tiles-v1');
}
