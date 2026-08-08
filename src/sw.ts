/**
 * Service Worker — stratégie offline pour les tuiles WMTS IGN
 *
 * Stratégie :
 * - Cache-first pour les tuiles WMTS IGN (data.geopf.fr) : couches cartographiques
 * - Network-first pour le reste : app, API
 *
 * Quota managé : LRU eviction à ~2000 tuiles dans le cache
 */

/// <reference lib="webworker" />

// Extend ServiceWorkerGlobalScope to include __WB_MANIFEST
interface ExtendedServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  __WB_MANIFEST?: (string | { url: string; revision: string | null })[];
}

declare const self: ExtendedServiceWorkerGlobalScope;

// Workbox injection point — workbox-build will replace __WB_MANIFEST
// Do not remove or modify this line
// eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-const, no-var
var __WB_MANIFEST: any = (self as any).__WB_MANIFEST || [];

// Noms des caches par domaine et type
const TILE_CACHE_NAME = 'ign-tiles-v1';
const APP_CACHE_NAME = 'app-v1';
const MAX_TILE_CACHE_ENTRIES = 2000;

/**
 * Nettoyer le cache des tuiles si quota dépassé (LRU simple)
 * Garde les MAX_TILE_CACHE_ENTRIES entrées les plus récentes
 */
async function evictOldTiles(): Promise<void> {
  const cache = await caches.open(TILE_CACHE_NAME);
  const keys = await cache.keys();

  if (keys.length > MAX_TILE_CACHE_ENTRIES) {
    // Supprimer les premières entrées (FIFO simple, pas un vrai LRU)
    const toDelete = keys.slice(0, keys.length - MAX_TILE_CACHE_ENTRIES + 100);
    for (const key of toDelete) {
      await cache.delete(key);
    }
  }
}

/**
 * Stratégie Cache-First pour les tuiles WMTS
 */
async function cacheTile(request: Request): Promise<Response> {
  const cache = await caches.open(TILE_CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (!response.ok) {
      return response;
    }

    // Cloner la réponse car elle ne peut être consommée qu'une fois
    const responseToCache = response.clone();
    await cache.put(request, responseToCache);

    // Nettoyer si besoin (async, ne pas bloquer)
    evictOldTiles().catch(err => console.error('LRU eviction failed:', err));

    return response;
  } catch (error) {
    console.error('Fetch failed for tile:', request.url, error);
    // Pas de fallback offline pour les tuiles absentes du cache
    // L'app affiche un message d'erreur utilisateur
    throw error;
  }
}

/**
 * Stratégie Network-First pour le reste (app, API)
 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Mettre en cache les réponses réussies de l'app
    if (request.method === 'GET' && !request.url.includes('/api/')) {
      const cache = await caches.open(APP_CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {
        // Silencieusement échouer si le cache échoue (quota)
      });
    }

    return response;
  } catch (error) {
    // Essayer le cache si le réseau échoue
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Pas de cache et pas de réseau : erreur
    console.error('Network request failed:', request.url, error);
    throw error;
  }
}

// Installation : pré-remplir le cache app avec les ressources critiques (injectManifest)
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(APP_CACHE_NAME).then(cache => {
      // Use workbox-injected manifest if available, else fallback to critical resources
      if (typeof __WB_MANIFEST !== 'undefined' && Array.isArray(__WB_MANIFEST)) {
        const urlsToCache = __WB_MANIFEST.map(entry => {
          return typeof entry === 'string' ? entry : entry.url;
        });
        return cache.addAll(urlsToCache).catch(() => {
          // Silencieusement échouer si le pré-cache échoue (les ressources seront en network-first)
        });
      }
      // Fallback if manifest not yet injected
      return cache.addAll([
        '/',
        '/index.html',
      ]).catch(() => {
        // Silencieusement échouer si le pré-cache échoue (les ressources seront en network-first)
      });
    })
  );
  // Force le SW à s'activer immédiatement
  self.skipWaiting();
});

// Activation : nettoyer les anciens caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== TILE_CACHE_NAME && name !== APP_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch : router vers la bonne stratégie
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Tuiles WMTS IGN : cache-first
  if (url.hostname === 'data.geopf.fr' && url.pathname.includes('/wmts')) {
    event.respondWith(cacheTile(request));
    return;
  }

  // PMTiles locales ou distantes : cache-first aussi
  if (request.url.includes('.pmtiles') || url.pathname.includes('/data/derived/')) {
    event.respondWith(cacheTile(request));
    return;
  }

  // App et API : network-first
  event.respondWith(networkFirst(request));
});

// Message du client : demander l'état du cache
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'CACHE_QUOTA_INFO') {
    (async () => {
      try {
        const estimate = await navigator.storage.estimate();
        const tileCache = await caches.open(TILE_CACHE_NAME);
        const tileKeys = await tileCache.keys();

        const port = event.ports[0];
        if (port) {
          port.postMessage({
            type: 'CACHE_QUOTA_INFO',
            quota: estimate.quota || 0,
            usage: estimate.usage || 0,
            tileCacheSize: tileKeys.length,
          });
        }
      } catch (error) {
        const port = event.ports[0];
        if (port) {
          port.postMessage({ type: 'ERROR', error: String(error) });
        }
      }
    })();
  }

  if (event.data?.type === 'CLEAR_TILE_CACHE') {
    (async () => {
      try {
        await caches.delete(TILE_CACHE_NAME);
        const port = event.ports[0];
        if (port) {
          port.postMessage({ type: 'CACHE_CLEARED', cache: TILE_CACHE_NAME });
        }
      } catch (error) {
        const port = event.ports[0];
        if (port) {
          port.postMessage({ type: 'ERROR', error: String(error) });
        }
      }
    })();
  }
});

export {}; // Mark as module for TypeScript
