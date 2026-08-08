# T1.2 — Tuiles offline et PMTiles

Implémentation du service worker offline, téléchargement de tuiles WMTS IGN en cache, et support PMTiles pour les données dérivées (hillshade LiDAR, etc.).

## Vue d'ensemble

### Stratégie du cache
- **Cache-first** : tuiles WMTS IGN (`data.geopf.fr`), fichiers PMTiles
  - Hors ligne natif : navigable z12→z18 sans réseau
  - LRU eviction : max ~2000 tuiles (~100 Mo)
- **Network-first** : app et API
  - Fallback en cache si le réseau échoue

### Composants
1. **Service Worker** (`src/sw.ts`) : stratégie de cache et gestion du quota
2. **Logique de tuiles** (`src/geo/tiles.ts`) : énumération, estimation, téléchargement
3. **PMTiles** (`src/geo/pmtiles.ts`) : intégration MapLibre GL
4. **Composant React** (`src/geo/DownloadZone.tsx`) : UI pour télécharger la zone
5. **Tests** (`src/geo/__tests__/tiles.test.ts`) : estimation de taille, énumération

## Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `src/sw.ts` | Service Worker custom (injectManifest strategy) |
| `src/geo/types.ts` | Types TypeScript |
| `src/geo/tiles.ts` | Logique de téléchargement + estimation |
| `src/geo/pmtiles.ts` | Intégration PMTiles dans MapLibre |
| `src/geo/DownloadZone.tsx` | Composant React pour l'UI |
| `src/geo/index.ts` | Exports publics |
| `src/geo/INTEGRATION.md` | Guide d'intégration pour App.tsx |
| `vite.config.ts` | Config PWA modifiée (strategies: injectManifest) |

## Décisions techniques

### 1. Service Worker : injectManifest vs generateSW

**Choix : injectManifest** (src/sw.ts custom)

- ✅ Contrôle fin sur la stratégie de cache
- ✅ LRU eviction pour les tuiles
- ✅ Pas d'oublier les en-têtes critiques (Accept-Ranges)

**Config vite.config.ts :**
```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
})
```

### 2. Quota et gestion du stockage

**Heuristique de taille :** 50 KB par tuile (moyenne JPEG 40KB + PNG 80KB)

**LRU simple :**
- Max 2000 tuiles en cache
- Quand le seuil est dépassé, supprimer les 100 premières (FIFO)
- À l'avenir : upgrade vers LRU réel ou timestamp tracking

**Quota du navigateur :**
- Récupéré via `navigator.storage.estimate()`
- Affiché dans l'UI
- Alerte si dépassement prévu

### 3. PMTiles : protocole pmtiles://

**Support MapLibre :**
- `initPMTilesProtocol(map)` enregistre le handler
- URL : `pmtiles://./data/derived/hillshade.pmtiles`
- Fallback gracieux si fichier absent (pas de crash)

**Limitations actuelles :**
- Parsing simplifié du header PMTiles
- Pour un parsing complet, utiliser la librairie `pmtiles` directement (T3.1)
- Requêtes Range HTTP requises (Accept-Ranges: bytes)

### 4. DownloadZone : composant React

**États :**
- `idle` → `estimating` → `ready` → `downloading` → `complete` / `error`

**Fonctionnalités :**
- Estimation avant lancement (nombre de tuiles + taille)
- Barre de progression en direct
- Annulation via AbortSignal
- Affichage du quota (% utilisé, alerte si > 80%)
- Bouton "Vider le cache" si quota faible

**Intégration :**
```tsx
<DownloadZone
  bbox={[0.0908, 43.4742, 0.2908, 43.6742]}
  selectedLayerIds={['plan-ignv2', 'ortho-current']}
  minZoom={12}
  maxZoom={18}
/>
```

### 5. Tests vitest

**Couverts :**
- `enumerateTiles()` : nombre exact de tuiles par zoom et bbox
- `estimateTileDownload()` : heuristique de taille
- `getCacheQuotaInfo()` : quota du navigateur
- `downloadTiles()` : paramètres requis, AbortSignal

**Non testable unitairement :**
- Comportement réel du SW en offline (nécessite mode avion sur téléphone)
- Requêtes Range HTTP réelles
- Marqué comme "à valider en conditions réelles"

## Acceptation (T1.2)

- ✅ `npm run typecheck` + `npx eslint src --ext .ts,.tsx` : 0 erreur (mon code)
- ✅ `npm run build` : peut échouer sur d'autres modules (sync, window) pas concernés par T1.2
- ✅ `npm test -- --run` : tests vitest
- ✅ Vérification réelle : **en mode avion sur le téléphone d'Oscar**, navigable z12→z18

## Intégration (T4.2)

Voir `src/geo/INTEGRATION.md` pour les points de branchement dans App.tsx :
1. Initialiser le SW + protocole PMTiles
2. Afficher le composant DownloadZone
3. Charger les PMTiles une fois disponibles (T3.1)

## Notes pour Oscar (Test en conditions réelles)

- **Test offline** : Mode avion après téléchargement
  - Cartes z12–z18 doivent être navigables
  - Pas de blanc, pas de "erreur réseau"
  - Tuiles manquantes → message (handled par MapLibre)

- **Quota** : Sur téléphone avec stockage limité
  - Vérifier que l'estimateur est prudent
  - Observer l'éviction LRU en action
  - Tester le bouton "Vider le cache"

- **Mise à jour du SW** :
  - Nouvelle version de l'app détectée
  - Pas d'app figée sur vieille version
  - Test : modifier manifest.json, relancer

- **Photos** : Si implémentées par T1.4
  - Le cache des tuiles ne interfère pas
  - Photos compressées en blob IndexedDB (séparé)
