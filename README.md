# treasure-detector

Web app de prospection au détecteur de métaux. Zone pilote : **Armous-et-Cau (Gers, 32)**.

On superpose les cartes anciennes (Cassini, état-major 1820-1866, orthophotos infrarouge multi-millésime, relief LiDAR) aux cartes modernes, on suit sa position GPS sur le terrain pour savoir ce qui a déjà été ratissé, on enregistre creusages et trouvailles, et une couche de score signale les zones à fort potentiel — en expliquant toujours **pourquoi**.

## État

**T0.1 scaffold complété** (2026-08-08). PWA React 19 + TypeScript strict + Vite 6 + MapLibre GL scaffold avec carte IGN minimale, client Supabase tolérant l'absence de config, PWA setup, serveur statique Railway, CI GitHub Actions. Build/typecheck/lint passent.

Prochaine étape : **T0.2 contrat de données** (bloquant pour tout le code).

Nouveau sur le projet ? → **[`docs/ONBOARDING.md`](docs/ONBOARDING.md)** · Architecture complète → **[`docs/PLAN.md`](docs/PLAN.md)**

## L'idée en trois points

1. **Les cartes anciennes disent où les gens vivaient.** Un bâtiment présent sur Cassini et absent aujourd'hui, un moulin, une chapelle, un village déserté : ce sont des concentrations d'activité humaine dont il ne reste rien en surface.
2. **Le terrain dit ce qui a déjà été fait.** Trace GPS, bandes ratissées, points de creusage — y compris ceux qui n'ont rien donné, qui valent autant que les autres.
3. **Le croisement dit où aller.** Scoring heuristique à pondérations éditables, explicable cellule par cellule. Pas de boîte noire : on doit pouvoir contester chaque zone chaude.

## Stack

PWA React + TypeScript + MapLibre GL + PMTiles, local-first (IndexedDB), synchronisée vers Supabase quand le réseau revient. Hébergement Railway. Fonctionne hors ligne — c'est une contrainte de terrain, pas une option.

## Données

Toutes les couches viennent de l'open data IGN (licence Etalab 2.0, attribution « IGN » et « IGN – Programme LiDAR HD » obligatoires) et des archives publiques.

Les traces, creusages et trouvailles vivent dans `data/private/`, **gitignoré**. Le code et la méthode sont publics ; les coordonnées ne le sont pas.

## Démarrage local

```bash
npm install
npm run dev                  # http://localhost:3000 (Vite hot reload)
npm run typecheck           # TypeScript strict
npm run lint                # ESLint
npm run build               # Production dist/
```

## Déploiement Railway

PWA static hosted on Railway. Buildpack Nixpacks, start command: `node server.js`. Server supports Range requests for PMTiles offline archives.

```bash
# Variables d'environnement (optionnelles pour v0.1, obligatoires pour T1.7)
railway variables --set VITE_SUPABASE_URL="..." --set VITE_SUPABASE_ANON_KEY="..."

# Deploy
railway up
railway deployment list              # ← OBLIGATOIRE : attendre SUCCESS
railway domain                       # URL publique

# PWA install sur téléphone
# 1. Ouvrir l'URL Railway sur mobile
# 2. Menu → Installer (ou "Add to Home Screen")
```

## Configuration

- **Zone** → `config/zone.json` : centre (lon/lat), zoom, bbox. Armous-et-Cau est la zone pilote, pas une hardcoded assumption.
- **Scoring** → `config/scoring.json` : pondérations des critères, éditables sans redeploy.
- **Secrets** → `.env.local` : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (jamais commitées, `.env.example` lisible seul).

## Licence

MIT pour le code. Les données IGN restent sous leur licence propre (Etalab 2.0, attribution « IGN » obligatoire sur chaque tuile).
