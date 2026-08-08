# prototype/ — spike carto (jetable)

Prototype construit **en parallèle du plan**, le 2026-08-08, avant l'ouverture des lots de `docs/PLAN.md`.

## Ce que c'est — et ce que ce n'est PAS

- **C'est** un *spike* : une carte Leaflet mono-fichier (`index.html`) qui superpose Cassini / État-Major / orthophoto IGN, suit le GPS, laisse poser des points et les exporter en GPX. Son but est de **valider les flux de données** du plan et de dégrossir les cibles de la zone pilote.
- **Ce n'est PAS** l'application cible. La v1 décrite dans `docs/PLAN.md` est une **PWA React + TypeScript + MapLibre GL + PMTiles + Supabase**, local-first et hors-ligne. Ce prototype utilise Leaflet et le streaming WMTS direct — il ne réutilise donc **aucune** ligne de la future app. Pas de double emploi : il sert de preuve et de référence, pas de base de code.

## Ce qu'il apporte au plan

1. **Il lève plusieurs `[À VÉRIFIER]` du §4.1** (identifiants WMTS IGN confirmés en conditions réelles) — voir [`FINDINGS.md`](FINDINGS.md).
2. **Il documente un gotcha réseau** (IPv4 obligatoire en local) — voir `FINDINGS.md`.
3. **Il fournit un premier jeu de 16 cibles géolocalisées** (positions OSM exactes + interprétation toponymique), matière directe pour `docs/zone/CIBLES.md` et `docs/zone/TOPONYMIE.md`.
4. **Il valide la chaîne de déploiement Railway** (statique servi par `serve`).

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | La carte interactive (Leaflet + WMTS IGN + cibles + GPS + GPX) |
| `package.json` | Sert le statique via `serve` (déploiement Railway) |
| `prospection-armous.pdf` | Fiche de terrain : 18 cibles avec coordonnées GPS, époque, mobilier attendu |

## Déploiement (séparé du futur projet)

Déployé le 2026-08-08 sur un projet Railway **distinct** (`carto-armous`) :
**https://carto-armous-production.up.railway.app**

À fusionner ou retirer quand la vraie PWA `treasure-detector` sera hébergée.

## Statut

À conserver comme référence tant que la carte MapLibre (lot T1.1) n'a pas atteint la parité fonctionnelle, puis archivable.
