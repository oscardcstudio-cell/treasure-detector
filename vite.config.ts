import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /**
       * injectManifest : utiliser notre sw.ts custom (src/sw.ts)
       * au lieu de generateSW qui génère automatiquement
       *
       * Permet une stratégie de cache fine-tuned :
       * - Cache-first pour les tuiles WMTS IGN (data.geopf.fr)
       * - Network-first pour l'app et l'API
       * - LRU eviction sur le cache des tuiles (~2000 entrées)
       */
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifestFilename: 'manifest.json',

      manifest: {
        name: 'treasure-detector',
        short_name: 'Treasure',
        description: 'Web app de prospection au détecteur de métaux',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },

      workbox: {
        // Non utilisé avec injectManifest, mais laissé pour ref
        clientsClaim: true,
        skipWaiting: false,
      },

      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/index.html',
      },

      // Instruire le SW de traiter les fichiers app
      includeAssets: [
        'index.html',
        'icon.svg',
      ],
    }),
  ],

  /**
   * MapLibre GL v6 instancie son worker en `{ type: 'module' }` : le worker
   * émis par Vite (voir src/map/maplibreWorker.ts) doit donc être un ES module.
   * En 'iife' (défaut) le worker se charge mais échoue au premier import.
   */
  worker: {
    format: 'es',
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    /**
     * En-têtes HTTP critiques pour offline + update strategy
     * à configurer côté serveur (Railway)
     *
     * Service-Worker-Allowed: /
     *   Permet au SW de servir toutes les routes (pas juste /sw.js)
     *
     * Cache-Control: no-cache, no-store, must-revalidate
     *   Sur sw.js : force le navigateur à vérifier la mise à jour
     *
     * Accept-Ranges: bytes
     *   Requis par PMTiles (requêtes Range pour tuiles)
     */
  },

  server: {
    strictPort: true,
    port: 3000,
    /**
     * Fallback SPA : toutes les routes non-fichier redirigent vers index.html
     * Permet la navigation SPA offline
     */
    middlewareMode: false,
  },
});
