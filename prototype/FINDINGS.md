# Findings du spike — 2026-08-08

Données produites/vérifiées pendant la construction du prototype. À intégrer proprement dans le plan et `docs/zone/` lors de la session de plan.

## 1. Identifiants WMTS IGN — CONFIRMÉS (lève des `[À VÉRIFIER]` du §4.1)

Vérifiés par requête `GetTile` réelle (HTTP 200, PNG/JPEG valides) et lecture des capabilities `cartes.xml` / `ortho.xml`.

| Couche | Identifiant | Format | TileMatrixSet | Zoom | Statut |
|---|---|---|---|---|---|
| Cassini (BnF, couverture nationale) | `BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI` | `image/png` | `PM_6_14` | 6–14 | CONFIRMÉ |
| État-major 1820–1866 | `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` | `image/jpeg` | `PM_6_15` | 6–15 | CONFIRMÉ |
| Orthophotos | `ORTHOIMAGERY.ORTHOPHOTOS` | `image/jpeg` | `PM_0_19` | 0–19 | CONFIRMÉ |
| Plan IGN v2 | `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` | `image/png` | `PM` | 0–19 | CONFIRMÉ |

- **Le préfixe `BNF-IGNF_` est requis** pour la Cassini (renumérisée 400 dpi, nov. 2024). Sans lui, pas de tuile.
- Cassini plafonne à **z14** : au-delà, aucune tuile native — prévoir `maxNativeZoom`.
- Template REST GetTile :
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=<id>&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=<fmt>`
- `PM` = Web Mercator (EPSG:3857) → `{z}/{x}/{y}` standard mappent directement sur TILEMATRIX/TILECOL/TILEROW.

## 2. Gotcha réseau (complète le §0 du plan)

- **En conteneur Claude Code** : le proxy bloque `data.geopf.fr` (confirmé, cohérent avec le plan → tâches `[MACHINE LOCALE]`).
- **Sur la machine locale (Mac)** : le domaine résout, mais **`curl` échoue en IPv6** (`exit 6`). Forcer **IPv4 (`curl -4`)** règle tout. En navigateur, le happy-eyeballs bascule seul sur IPv4 → les tuiles s'affichent sans réglage. Confirmé en ligne sur le déploiement Railway.

## 3. Cibles géolocalisées (positions OSM exactes ; interprétation = déduction toponymique à confirmer)

Récupérées via Overpass (348 features de la commune analysées). Catégories : Majeur / Fortifié-religieux / Voie / Habitat / Repère.

| Cible | Cat | Lat | Lon | Époque | Mobilier attendu |
|---|---|---|---|---|---|
| Lamothe — motte castrale probable | Majeur | 43.55358 | 0.19112 | Médiéval XIe-XIIIe | Monnaies féodales, ferronnerie, plomb |
| Église disparue de Cau | Majeur | 43.57179 | 0.18647 | Médiéval-moderne | Plomb, monnaies dévotion (ne pas creuser : sépultures) |
| Le Cau — ancien village | Majeur | 43.57283 | 0.19164 | Médiéval-moderne | Monnaies, boutons, boucles, dés |
| Église disparue d'Armous (Cimetière) | Majeur | 43.56254 | 0.17489 | Médiéval-moderne | Plomb, monnaies dévotion, objets liturgiques |
| A l'Église (sud) — chapelle ? | Majeur | 43.54944 | 0.19009 | Médiéval | Plomb, monnaies, éléments d'édifice |
| Au Castérot — fort probable | Forti | 43.57655 | 0.17450 | Médiéval | Ferronnerie, pointes, monnaies, plomb |
| Au Priou — prieuré probable | Forti | 43.55774 | 0.18818 | Médiéval | Monnaies, plomb, objets religieux |
| Saint-Lannes — hagiotoponyme | Forti | 43.58031 | 0.17065 | Médiéval | Monnaies, plomb, indices d'édifice |
| Saint-Mesplin — hagiotoponyme | Forti | 43.58878 | 0.20095 | Médiéval | Monnaies, plomb, indices d'édifice |
| Las Carretères — voie ancienne | Voie | 43.57094 | 0.20128 | Antique-moderne | Monnaies perdues, ferrures, plombs, clous |
| Les Peyrères — empierrement/voie | Voie | 43.57270 | 0.20148 | Antique ? | Monnaies, mobilier romain possible |
| A Carrère (sud) — chemin | Voie | 43.54173 | 0.16948 | Ancien | Monnaies, objets perdus le long |
| Le Bourdiou — métairie | Habitat | 43.55501 | 0.18731 | XVIe-XIXe | Monnaies royales, boutons, boucles, dés |
| Au Sarthou — essart | Habitat | 43.55865 | 0.19475 | Médiéval | Ferraille agricole, monnaies |
| Au Four — ancien four | Habitat | 43.56176 | 0.20341 | Ancien | Scories, terre cuite, ferronnerie |
| Église actuelle Saint-Martin (repère) | Repère | 43.57359 | 0.18760 | XIXe | Bâtie des pierres des 2 églises disparues |
| Château de Flourès (repère) | Repère | 43.55041 | 0.17997 | Manoir | — |

**Ténarèze / Route de César** : tracé indicatif (axe de crête NE-SO) reliant les toponymes de voie ci-dessus. À caler précisément (le plan §2.4 pointe la Via Tolosana/GR653 — distinguer voie de crête et itinéraire de pèlerinage).

Ces lectures recoupent le §2.5 du plan (toponymie gasconne) : `mothe`, `castèra/castérot`, `glèisa`, hagiotoponymes, `carrère`, `peyre`, `borde`, essart. À confronter aux formes anciennes du cadastre napoléonien (AD32) avant de figer.

## 4. Déploiement

- Spike en ligne (projet Railway **séparé** `carto-armous`, statique via `serve`) : https://carto-armous-production.up.railway.app
- Confirme que la chaîne Railway statique fonctionne (à répliquer pour la vraie PWA, §5.3).
