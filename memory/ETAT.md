# État du projet — treasure-detector

> Mis à jour le 2026-08-08 au soir. Plan complet : [`docs/PLAN.md`](../docs/PLAN.md) · Verdict v1 : [`T4.2_VERDICT.md`](T4.2_VERDICT.md).

## Où on en est

**v1 construite, déployée et validée en une journée — verdict T4.2 : GO SOUS CONDITIONS.**

- **App en ligne** : https://treasure-detector-production.up.railway.app (deploy 6df88078 SUCCESS). Projet Railway `treasure-detector` (667462b8), séparé du spike `carto-armous`.
- **Tous les lots livrés** sauf l'exécution réelle de T3.1 : phase 0 (scaffold + contrat), phase 1 complète (cartes 11 couches + rideau, GPS/zones ratissées, trouvailles ACE 250, sauvegarde, offline, fenêtre de sortie, sync Supabase), phase 2 complète (HISTOIRE, SOURCES, TOPONYMIE, CIBLES — 28 cibles), phase 3 (scoring 8 critères actifs + moteur H3 + presets + zones signalées), phase 4 (METHODE_TERRAIN relu + T4.2).
- **230 tests verts, typecheck/lint 0 erreur, CI GitHub verte.**
- Bloquant attrapé et corrigé par T4.2 : aplatissement `Session.detector` dans la sync (risque 18 du plan, commit 9a79370).
- Fonctionnalité bonus demandée par Oscar : punchlines sur les cibles (`config/hype.json`, éditable — pastiches originaux style Tony Montana + argot terrain, PAS de répliques du film : repo public, droits).

## Conditions restantes du GO (dans l'ordre)

1. **Oscar — téléphone** : installer la PWA depuis l'URL, tester le mode avion après « Télécharger la zone », lisibilité au soleil. Débloque la 1re sortie.
2. **Oscar — Supabase (~5 min)** : créer le projet sur supabase.com puis suivre [`supabase/README.md`](../supabase/README.md) (login, link, db push, clés dans Railway + secrets GitHub). Puis tester la RLS depuis une session anonyme (commande dans le README).
3. **T3.1 exécution réelle** : scripts prêts dans `tools/prep/` (rvt-py Apache 2.0 vérifié), MNT LiDAR à télécharger et dérivés SVF/LRM/hillshade à générer (≤2 Go, GDAL via brew). Non exécuté — la preuve de concept est simulée.
4. **Photos dans l'export** : le round-trip est testé avec `photos: []` — couvrir en v1.1.
5. **Cadastre 1813** : captures zoom max demandées à Oscar (trio Eglize/Presbitaire/« Devant l'église » avec la cote, Moulin de Floures, tableau d'assemblage) — voir addendum de [`CIBLES.md`](../docs/zone/CIBLES.md).

## Gotchas opérationnels (appris ce jour, dans CLAUDE.md)

Déploiement UNIQUEMENT depuis `git archive HEAD` (jamais le working dir partagé) · Nixpacks abandonné pour Dockerfile (EBUSY) · Express 5 : fallback SPA en middleware, pas de route `'*'` · Gallica : User-Agent navigateur obligatoire · ortho 1950-65 dispo en WMTS (`image/png` seul).

## Après la 1re sortie (calibrage — §13.2 du plan)

Traces réelles → seuil `ratisse`/`passage_rapide` (0,45 m/s [HYPOTHÈSE]) · largeur d'arc réelle · fourchettes de sensibilité des presets sur `DigPoint` réels.
