# treasure-detector

Web app de prospection au détecteur de métaux. Zone pilote : **Armous-et-Cau (Gers, 32)**.

On superpose les cartes anciennes (Cassini, état-major 1820-1866, orthophotos infrarouge multi-millésime, relief LiDAR) aux cartes modernes, on suit sa position GPS sur le terrain pour savoir ce qui a déjà été ratissé, on enregistre creusages et trouvailles, et une couche de score signale les zones à fort potentiel — en expliquant toujours **pourquoi**.

## État

**Phase de plan.** Rien n'est encore implémenté. Tout est dans **[`docs/PLAN.md`](docs/PLAN.md)** : contexte historique de la zone, sources de données, architecture, contrat de données, moteur de scoring, et le découpage en 20 lots exécutables.

Nouveau sur le projet ? → **[`docs/ONBOARDING.md`](docs/ONBOARDING.md)**

## L'idée en trois points

1. **Les cartes anciennes disent où les gens vivaient.** Un bâtiment présent sur Cassini et absent aujourd'hui, un moulin, une chapelle, un village déserté : ce sont des concentrations d'activité humaine dont il ne reste rien en surface.
2. **Le terrain dit ce qui a déjà été fait.** Trace GPS, bandes ratissées, points de creusage — y compris ceux qui n'ont rien donné, qui valent autant que les autres.
3. **Le croisement dit où aller.** Scoring heuristique à pondérations éditables, explicable cellule par cellule. Pas de boîte noire : on doit pouvoir contester chaque zone chaude.

## Stack

PWA React + TypeScript + MapLibre GL + PMTiles, local-first (IndexedDB), synchronisée vers Supabase quand le réseau revient. Hébergement Railway. Fonctionne hors ligne — c'est une contrainte de terrain, pas une option.

## Données

Toutes les couches viennent de l'open data IGN (licence Etalab 2.0, attribution « IGN » et « IGN – Programme LiDAR HD » obligatoires) et des archives publiques.

Les traces, creusages et trouvailles vivent dans `data/private/`, **gitignoré**. Le code et la méthode sont publics ; les coordonnées ne le sont pas.

## Licence

MIT pour le code. Les données IGN restent sous leur licence propre.
