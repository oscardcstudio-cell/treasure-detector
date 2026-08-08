/**
 * Câblage du worker MapLibre GL — à importer AVANT toute création de carte.
 *
 * MapLibre GL v6 n'embarque plus son worker : il le charge à l'exécution depuis
 * un fichier voisin, résolu par `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
 * Une fois la librairie bundlée par Vite, `import.meta.url` vaut
 * `/assets/index-<hash>.js` — l'URL calculée pointe donc vers
 * `/assets/maplibre-gl-worker.mjs`, qui n'existe pas dans le build.
 *
 * Le `new Worker(url, { type: 'module' })` échoue alors de façon SILENCIEUSE
 * (événement `error` non écouté par MapLibre) : les tuiles raster continuent de
 * s'afficher — elles ne passent pas par le worker — mais TOUTE source GeoJSON
 * (carte de chaleur du scoring, zones signalées, traces) reste bloquée en
 * chargement, sans aucune erreur en console.
 *
 * Le `?worker&url` demande à Vite d'émettre le worker comme entrée dédiée
 * (ses imports internes résolus) et de nous rendre son URL réelle.
 * `worker.format: 'es'` dans vite.config.ts est obligatoire : MapLibre
 * l'instancie en module worker.
 *
 * Garde-fou : src/map/__tests__/maplibre-worker.test.ts
 */

import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(maplibreWorkerUrl);

export { maplibreWorkerUrl };
