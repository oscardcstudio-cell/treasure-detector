import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Serve static files with proper cache control and Range support
app.use(express.static(DIST_DIR, {
  maxAge: '1y', // Long cache for hashed assets
  etag: false, // Disable etag in favor of cache headers
  setHeaders: (res, filePath) => {
    // sw.js and index.html must not be cached long
    if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.match(/\.[a-f0-9]{8}\.(js|css)$/)) {
      // Hashed assets can be cached forever
      res.setHeader('Cache-Control', 'public, immutable, max-age=31536000');
    }

    // Accept-Ranges header for PMTiles support
    res.setHeader('Accept-Ranges', 'bytes');

    // Service-Worker-Allowed for PWA
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
    }
  },
}));

// SPA fallback: any request that doesn't match a file serves index.html
// (middleware sans motif : Express 5 / path-to-regexp 8 rejette la route '*')
app.use((req, res) => {
  // Le fallback ne vaut QUE pour les navigations de page. Sinon un fichier absent
  // (.geojson, .mjs, .json) recevait index.html en 200 : JSON.parse plantait et les
  // imports de module échouaient sur un MIME text/html, au lieu d'un 404 franc.
  const looksLikeFile = path.extname(req.path) !== '';
  const wantsHtml = (req.headers.accept || '').includes('text/html');
  if (looksLikeFile || !wantsHtml) {
    res.status(404).type('text/plain').send('Not found');
    return;
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving ${DIST_DIR}`);
});
