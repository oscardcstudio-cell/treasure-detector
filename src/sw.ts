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
// 6000 ≈ pack « autour de moi » (~2000 tuiles) + navigation libre, ~150-250 MB max
const MAX_TILE_CACHE_ENTRIES = 6000;

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

/**
 * Stale-while-revalidate : sert le cache tout de suite (offline-safe, zéro
 * latence terrain) et rafraîchit en tâche de fond — la donnée est à jour au
 * lancement suivant.
 */
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(TILE_CACHE_NAME);
  const cached = await cache.match(request);

  // no-cache : contourne le cache HTTP du navigateur (les anciennes réponses
  // portaient max-age=1 an — la revalidation tournait à vide sinon)
  const refresh = fetch(request, { cache: 'no-cache' })
    .then(async (response) => {
      if (response.ok && response.status === 200) {
        await cache.put(request, response.clone()).catch(() => {
          // Quota plein : tant pis pour le rafraîchissement du cache
        });
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    void refresh; // rafraîchit en arrière-plan
    return cached;
  }
  const fresh = await refresh;
  if (fresh) return fresh;
  return new Response('Offline', { status: 503 });
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

  // PMTiles : lectures par plages d'octets (Range). Le Cache API refuse les
  // réponses 206 (cache.put jette) : les faire passer en direct, sans cache —
  // sinon le SW casse toutes les couches relief.
  if (request.url.includes('.pmtiles')) {
    event.respondWith(fetch(request));
    return;
  }

  // Autres données dérivées (GeoJSON) : stale-while-revalidate.
  // Cache-first figeait les cibles/foncier pour toujours sur l'appareil
  // (constaté 2026-08-11 : nouvelles cibles jamais visibles côté téléphone).
  if (url.pathname.includes('/data/derived/')) {
    event.respondWith(staleWhileRevalidate(request));
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
