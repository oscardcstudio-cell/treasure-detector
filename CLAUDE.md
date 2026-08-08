# CLAUDE.md — treasure-detector

Web app (PWA) de prospection au détecteur de métaux. Zone pilote : **Armous-et-Cau (Gers, 32230)**.
Superpose cartes anciennes (Cassini, état-major, ortho IRC multi-millésime, LiDAR) aux cartes modernes, suit le GPS terrain, log creusages/trouvailles, et score les zones à fort potentiel — toujours en expliquant **pourquoi**.

## Le contrat d'exécution

**[`docs/PLAN.md`](docs/PLAN.md) est la source de vérité du projet (~900 lignes).** Architecture, contrat de données, scoring, découpage en 20 lots avec critères d'acceptation. Tout le code s'écrit contre ce plan. Le lire avant de toucher au code — au minimum §0 (conventions), §5 (archi), §6 (contrat de données), §8 (lots), §13 (dépendances).

Nouveau sur le projet → [`docs/ONBOARDING.md`](docs/ONBOARDING.md).

## La règle qui compte le plus

Le plan distingue trois statuts, et les mélanger est l'erreur la plus coûteuse ici :
- **[FAIT]** — sourcé, vérifié, utilisable tel quel.
- **[À VÉRIFIER]** — plausible non confirmé. **Vérifier avant de bâtir dessus**, corriger le doc si faux.
- **[HYPOTHÈSE]** — déduction sans source. **Ne pas transformer en contrainte.** Tester, ou demander à Oscar.

Corollaire (hérité du meta racine) : **jamais « fait / vert / déployé » sans preuve produite dans le même tour** — sortie brute de test, capture de preview, `railway deployment list` → `SUCCESS`. Pas de preuve → écrire « fait, non vérifié ». Le plan a déjà été corrigé une fois pour cette raison (§2.1, hydrographie).

## État actuel

**Phase de plan + spike carto validé.** La vraie app (PWA React) n'est pas commencée.
- `prototype/` = spike Leaflet jetable (superposition IGN + GPS + GPX). Valide les flux de données, **ne partage aucune ligne** avec la future PWA. Référence, pas base de code.
- Détail d'avancement, décisions figées et blocages en attente d'Oscar → [`memory/`](memory/).

## Stack cible (T0.1 à venir)

PWA **React 19 + TS strict + Vite + MapLibre GL + PMTiles + Dexie (IndexedDB)** — local-first, offline natif.
**Supabase** (Postgres + PostGIS + Storage) pour données/photos, **aucune API à écrire**. **Railway** héberge la PWA statique.
`tools/prep/` = pipeline Python (LiDAR/GDAL, calage cadastre) hors app.

## Invariants non négociables

- **La zone est un paramètre** de `config/zone.json`, jamais en dur. Armous-et-Cau est la zone pilote, pas une hypothèse d'archi.
- **`data/private/` est gitignoré** (coordonnées de trouvailles) — repo public, cibles privées. Voulu.
- **Ne jamais committer la clé Supabase `service_role`.** La clé `anon` dans le bundle est normale ET voulue — **à condition que la RLS soit active sur toutes les tables**. C'est le seul vrai risque sécu du projet.
- **Ne jamais copier une ligne de [`lidar2map`](https://github.com/nico579/lidar2map)** (GPL-3, contaminerait le repo public). Réimplémenter SVF/LRM depuis les publications, ou l'utiliser comme outil externe.
- **Artefacts lourds** (`*.pmtiles`, `*.laz`, `*.tif`) → **GitHub Releases**, jamais dans git (repo public inclonable sinon). Déjà gitignorés.
- **Aucune interpolation en ligne droite** à travers un trou de trace GPS — segments distincts, sinon fausse couverture.
- **Reprojection uniquement dans `tools/prep/`.** WMTS `PM` = EPSG:3857 ; stockage app = WGS84 (4326) ; LiDAR/cadastre/BD TOPO = Lambert-93 (2154). Un décalage de projection non détecté = couches à quelques dizaines de mètres à côté, l'erreur la plus discrète du projet.

## Flux IGN — confirmés (spike 2026-08-08)

Identifiants WMTS vérifiés par `GetTile` réel — détail dans [`prototype/FINDINGS.md`](prototype/FINDINGS.md) :
- Cassini : `BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI` — **préfixe `BNF-IGNF_` requis**, plafonne à **z14** (prévoir `maxNativeZoom`).
- État-major : `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` (z6–15) · Ortho : `ORTHOIMAGERY.ORTHOPHOTOS` (`PM_0_19`) · Plan : `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2`.
- **Gotcha réseau** : en conteneur, le proxy bloque `data.geopf.fr` → tâches `[MACHINE LOCALE]`. Sur Mac, `curl` échoue en IPv6 → forcer **`curl -4`** (le navigateur bascule seul). Gallica exige un **User-Agent navigateur** (403 sinon).
- **Déploiement Railway** : `railway up` UNIQUEMENT depuis un export propre du dernier commit (`git archive HEAD | tar -x -C <tmp>` puis `railway link -p <id> -e production -s treasure-detector && railway up`) — jamais depuis le répertoire de travail : les fichiers en cours d'écriture d'agents parallèles partent dans le build et le cassent.

## Git / GitHub

- Remote : **`oscardcstudio-cell`** (compte perso). Vérifier le bon compte avant push (`gh auth switch` si besoin — double compte sur la machine).
- Repo **public** — objectif de prospection assumé. Commits en français, une intention par commit. Bugfix → ligne `Root cause: <cause systémique>`.
- **Auto-push** après commit significatif (règle globale Engue).

## Travail multi-agents (voir §8 du plan)

Contrat d'abord (T0.2 = barrière) · **1 agent = 1 fichier** (ownership exclusif par lot) · review = N lentilles · integration-check final (T4.2, droit de veto).
Modèles : `sonnet` pour code/recherche · `haiku` pour lookup pur · `opus` seulement sur T0.2. **Toujours passer `model` explicitement** à chaque `Agent` — sans ça il hérite du parent (opus), invisible sauf sur la facture.
