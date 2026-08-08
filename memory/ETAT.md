# État du projet — treasure-detector

> Mis à jour le 2026-08-08. Le plan complet est dans [`docs/PLAN.md`](../docs/PLAN.md) ; ce fichier ne garde que l'avancement.

## Où on en est

**Phase de plan terminée + spike carto validé. La vraie PWA n'est pas commencée.**

### Ce qui existe dans le repo
- `docs/PLAN.md` — contrat d'exécution complet (~900 lignes)
- `docs/ONBOARDING.md` — guide de démarrage
- `prototype/` — spike Leaflet jetable : superposition IGN + GPS + export GPX. **Réutilise 0 ligne** de la future PWA (Leaflet vs MapLibre). Déployé sur un projet Railway séparé `carto-armous` (https://carto-armous-production.up.railway.app)
- `README.md`, `LICENSE` (MIT), `.gitignore`, `CLAUDE.md`, `llms.txt`, `memory/`

### Ce qui n'existe PAS encore
Toute l'application. Aucun lot du plan (T0.1 → T4.2) n'est démarré. Pas de `src/`, pas de `config/`, pas de `supabase/`, pas de `tools/prep/`.

## Acquis du spike (déjà vérifiés, ne pas re-vérifier)
Détail dans [`prototype/FINDINGS.md`](../prototype/FINDINGS.md) :
1. **Identifiants WMTS IGN confirmés** en conditions réelles (lève des `[À VÉRIFIER]` du §4.1 du plan). Cassini = `BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI`, préfixe requis, plafond z14.
2. **Gotcha réseau** : proxy conteneur bloque IGN → `[MACHINE LOCALE]` ; en local forcer `curl -4`.
3. **16 cibles géolocalisées** (positions OSM + interprétation toponymique à confirmer sur cadastre). Matière directe pour `docs/zone/CIBLES.md` et `TOPONYMIE.md`.
4. **Chaîne Railway statique validée**.

## Prochaines étapes (ordre du plan §13)

1. **T0.1 — Scaffold** (`sonnet`) : Vite + React 19 + TS + MapLibre + Dexie + PWA, `config/zone.json`, CI, déploiement Railway. Acceptation : build vert + `railway deployment list` SUCCESS + carte affichée.
2. **T0.2 — Contrat de données** (`opus`) : **barrière — aucun lot de phase 1 avant son merge.**
3. Puis phase 1 (T1.1→T1.7, code, parallèle) et phase 2 (T2.1→T2.4, documents, parallèle).

**Chemin le plus court vers une 1re sortie terrain utile** (pas la v1 complète) :
`T0.1 + T0.2 + T1.1 + T1.3 + T1.4 + T1.5`, avec `CIBLES.md` (T2.4) comme cerveau provisoire. Le scoring auto peut suivre.

## Definition of Done v1
Voir §13.3 du plan — 10 critères, chacun avec sa preuve. Le critère qui prime : **une sortie de 3 h se log sans que ce soit pénible** (< 5 s pour enregistrer un creusage avec des gants).
