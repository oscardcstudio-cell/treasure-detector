# T1.2 Offline — Points d'intégration

## Structure des fichiers

```
src/geo/
├── index.ts              # Exports publics
├── types.ts              # Types (TileDownloadOptions, TileEstimate, etc.)
├── tiles.ts              # Logique de téléchargement des tuiles
├── pmtiles.ts            # Intégration PMTiles dans MapLibre
├── DownloadZone.tsx      # Composant React pour l'UI
└── __tests__/
    └── tiles.test.ts     # Tests vitest
```

## API publique (à importer dans App.tsx)

```typescript
import {
  // Types
  type TileDownloadOptions,
  type TileEstimate,
  type DownloadProgress,
  type CacheQuotaInfo,

  // Functions
  enumerateTiles,
  estimateTileDownload,
  getCacheQuotaInfo,
  queryCacheQuotaFromSW,
  downloadTiles,
  clearTileCache,

  // PMTiles
  initPMTilesProtocol,
  createPMTilesSource,
  checkPMTilesAvailable,
  getPMTilesMetadata,

  // Component
  DownloadZone,
} from '@/geo';
```

## Intégration dans App.tsx

### 1. Initialiser le Service Worker et le protocole PMTiles

```typescript
import { useEffect } from 'react';
import { useMap } from '@/map';
import { initPMTilesProtocol } from '@/geo';

export function AppShell() {
  const { mapInstance } = useMap();

  useEffect(() => {
    // Enregistrer le Service Worker (fourni par vite-plugin-pwa)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('SW registration failed:', err);
      });
    }

    // Initialiser le protocole PMTiles
    if (mapInstance) {
      initPMTilesProtocol(mapInstance);
    }
  }, [mapInstance]);

  return <div>{/* ... */}</div>;
}
```

### 2. Afficher le composant DownloadZone

```typescript
import { DownloadZone } from '@/geo';
import { ZONE_CONFIG } from '@/config/zone.json';

export function MapControls() {
  return (
    <div className="controls">
      <DownloadZone
        bbox={ZONE_CONFIG.bbox}
        selectedLayerIds={['plan-ignv2', 'ortho-current']}
        minZoom={12}
        maxZoom={18}
        onDownloadComplete={() => console.log('Downloaded!')}
        onError={(err) => console.error('Download error:', err)}
      />
    </div>
  );
}
```

### 3. Charger des couches PMTiles (une fois créées par T3.1)

```typescript
import { createPMTilesSource } from '@/geo';

// Ajouter une couche hillshade LiDAR (une fois le fichier disponible)
const hillshadeSource = createPMTilesSource('./data/derived/hillshade.pmtiles');
mapInstance.addSource('hillshade', hillshadeSource);
mapInstance.addLayer({
  id: 'hillshade',
  type: 'raster',
  source: 'hillshade',
  paint: { 'raster-opacity': 0.5 },
});
```

## Stratégie du Service Worker

### Cache-First (offline d'abord)
- **Tuiles WMTS** : `https://data.geopf.fr/**`
- **PMTiles** : `*.pmtiles` ou `/data/derived/**`
- **LRU** : max ~2000 tuiles en cache (environ 100 Mo)

### Network-First (réseau d'abord)
- **App et API** : fallback en cache si le réseau échoue
- **Stratégie update** : `skipWaiting: false` (attend la validation utilisateur)

### En-têtes HTTP critiques (côté serveur Railway)

**Sur `sw.js` :**
```
Cache-Control: no-cache, no-store, must-revalidate
Service-Worker-Allowed: /
```

**Sur tout le serveur statique :**
```
Accept-Ranges: bytes
```

(Vérifier avec : `curl -I -H 'Range: bytes=0-99' https://app-url/`)

## Tests

```bash
# Tests unitaires
npm test -- --run

# Tests spécifiques à geo/
npm test -- --run src/geo/__tests__/
```

### Couverture

- **enumerateTiles** : nombre exact de tuiles dans une bbox/zoom
- **estimateTileDownload** : heuristique de taille (50 KB par tuile)
- **downloadTiles** : validation des paramètres, annulation (AbortSignal)
- **getCacheQuotaInfo** : récupération du quota disponible

Note : Le comportement réel du SW (offline) doit être **testé sur le téléphone d'Oscar en mode avion**,
pas en assertions unitaires.

## Points à vérifier en intégration (T4.2)

1. **Service Worker actif**
   - `navigator.serviceWorker.controller` est défini
   - Requêtes en `data.geopf.fr` vont au cache, pas au réseau

2. **PMTiles**
   - Les fichiers sont accessibles à `./data/derived/*.pmtiles`
   - MapLibre peut les charger (fallback gracieux si absence)

3. **Quota**
   - Le quota du navigateur ne dépasse pas la limite système
   - Éviction LRU fonctionne (pas plus de 2000 tuiles)

4. **Offline réel**
   - Mode avion : carte navigable z12→z18 sans réseau
   - Les tuiles pré-téléchargées s'affichent, les autres affichent une erreur
   - Pas d'interpolation de tiles manquantes (gestion de l'erreur côté MapLibre)

5. **Update du SW**
   - Nouvelle version de l'app détectée (manifest change)
   - Notification utilisateur (si implémentée)
   - Pas d'app figée sur ancienne version
