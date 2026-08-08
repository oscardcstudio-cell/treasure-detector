# Reprise — état exact au 2026-08-08, 22h50

## Le problème à régler EN PREMIER : écran blanc en production

**L'app fonctionne en local, pas en ligne.** Preuve : `npm run build && PORT=4173 node server.js` puis navigateur → la carte d'Armous-et-Cau s'affiche, le bouton « Score Zone » passe à « ✓ Scoré ». Sur https://treasure-detector-production.up.railway.app → page blanche.

### Ce qui est déjà corrigé (commit da2ee4e, déployé, SUCCESS)
- `server.js` : le fallback SPA ne s'applique plus qu'aux navigations HTML — un fichier absent renvoie un vrai 404 (vérifié : `/data/derived/zones_signalees.geojson` → 404).
- `src/zones/source.ts` : ne relance plus l'erreur (elle rebouclait à l'infini, des dizaines de requêtes/seconde) → couche vide.
- `src/zones/ZonesLayer.tsx` : attend `map.once('load')` avant `addSource/addLayer`.

### Ce qui RESTE cassé en production (console du navigateur)
1. **`Failed to load module script: non-JavaScript MIME type "text/html"`**
   → un import de module ES reçoit `index.html`. Le serveur renvoie bien 404 maintenant, donc c'est le **service worker** (`src/sw.ts`, stratégie injectManifest) qui sert `index.html` depuis son cache pour des requêtes d'assets. Suspect : `/assets/maplibre-gl-worker.mjs` (vu en réseau, jamais émis dans `dist/assets/`).
2. **`Style is not done loading`** — persiste hors ZonesLayer : un autre composant ajoute une source/couche avant la fin du chargement du style. Chercher dans `src/scoring/ScoringLayer.tsx`, `src/app/useMapIntegration.ts`.
3. **Ancien bundle servi** : la console montre `index-DhWmz6I-.js` (ancien) ET `index-CnfXhw5A.js` (nouveau) → le SW garde une version périmée. Prévoir `skipWaiting`/`clients.claim` ou un bouton de mise à jour, sinon Oscar restera bloqué sur une vieille version (risque 9 du plan).

**Piste rapide à tester en premier** : désactiver le service worker en production (ou le limiter strictement aux tuiles IGN), redéployer, vérifier que la carte s'affiche. L'offline (T1.2) est un confort ; l'app qui démarre est la priorité.

## Bug n°2 : la couche de chaleur ne se dessine pas

Le calcul est bon (**420 cellules avec signal en 145 ms**, vérifié en exécutant `scoreZone` sur les vraies données), le bouton passe à « ✓ Scoré », mais **aucun hexagone n'apparaît**. Regarder `src/scoring/ScoringLayer.tsx` et `src/scoring/heat.ts` : ordre d'insertion de la couche, `beforeId`, opacité, ordre lon/lat des sommets d'hexagone.

Classement réel calculé sur les données actuelles :
| Score | Zone | Critère dominant |
|---|---|---|
| 51 | Source du Midour / Hountan | source + toponymes rang 1 et 2 groupés |
| 45 | Noyau villageois d'Armous | église XIe, cadastre 1813 |
| ~30 | Voie antique de Caussade | étymologie *calciata* |

## Corrections de fond déjà faites ce soir (ne pas refaire)
- Moteur de scoring : `polygonToCells` au lieu d'un échantillonnage à 1,1 km (6 cellules → 420) ; normalisation sur la somme des poids actifs (111) au lieu d'un plafond fixe de 250 qui écrasait tout sous 25/100.
- Sync : `Session.detector` aplati vers `detector_model`/`detector_settings` (bloquant T4.2).
- Auth par lien e-mail (`src/auth/`) + garde de sync : sans session, la RLS refusait toute écriture (401 vérifié en réel).

## Reste après ça
1. Photos non couvertes par le test d'export/réimport (`photos: []`).
2. Pipeline LiDAR `tools/prep/` jamais exécuté (Homebrew + GDAL non installés sur la machine).
3. Calage du cadastre 1813 — attend les captures pleine résolution d'Oscar (voir addendum de `docs/zone/CIBLES.md`).
