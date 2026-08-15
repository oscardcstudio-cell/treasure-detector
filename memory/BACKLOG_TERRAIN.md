# Backlog terrain — retours de session à implémenter

Recommandations données à Oscar en conversation pendant une session réelle (2026-08-11, prospection le long d'un petit cours d'eau à sec près d'Armous). Consignées ici pour implémentation ultérieure — rien de ce fichier n'est encore câblé dans le code.

## 1. Preset « Lit de rivière/ruisseau à sec »

**Constat terrain** : Oscar était debout à côté d'un ruisseau presque à sec pendant une session ; l'app n'affichait aucune recommandation de réglage à cet endroit. Deux causes cumulées :
1. Le critère de scoring `proximity_source` (rivières/gués) est inactif — voir `docs/PLAN.md` §10 risque 11. Sans donnée hydro, aucune cellule H3 proche du ruisseau n'est scorée → `PresetOverlay` (qui n'affiche une carte que si `activeCell` existe, cf. `src/presets/PresetOverlay.tsx:44`) ne se déclenche jamais là.
2. Même une fois `proximity_source` actif, il pointe vers le preset `moulin_bord_eau` (`config/presets.json:112`) — pensé pour un moulin/bief permanent, pas pour un lit à sec en étiage (transects perpendiculaires pour repérer un gué, sensibilité qui varie avec l'exposition du sédiment).

**Preset prêt à l'emploi** (respecte les enums validés par `src/presets/__tests__/presets.config.test.ts` — `sweep` ∈ {tres_lent, lent, normal}, `coil` ∈ {stock_6.5x9, sniper_4.5}, `notch` ∈ {aucune, fer_bas_seulement} ; toute variante de ces valeurs plantera le test d'intégrité) :

```json
{
  "id": "lit_riviere_asseche",
  "label": "Lit de rivière/ruisseau à sec",
  "mode": "all_metal",
  "sensitivity": [6, 7],
  "notch": "aucune",
  "coil": "stock_6.5x9",
  "sweep": "normal",
  "digRule": "Transects perpendiculaires à l'axe (chercher un resserrement = gué probable), puis le long des berges découvertes et en berge intérieure des méandres. Sniper 4,5\" si ferraille dense. Descendre à 4-5 sur les dépôts argileux/vase exposés — trier le fer agricole.",
  "expect": ["monnaies_perdues", "ferrures_de_gue", "objets_charries"],
  "why": "Étiage = fenêtre d'accès à un lit normalement immergé. Pertes concentrées au gué et en berge intérieure des méandres, pas au milieu d'un tronçon rectiligne.",
  "_status": "[HYPOTHÈSE — synthèse conversation Oscar 2026-08-11, non mesuré sur DigPoints réels]"
}
```

**Ajouté et retiré une fois pendant cette session** (tenté, revert immédiat) — l'ajout brut casse `presets.config.test.ts` sur deux points structurels à trancher avant de le remettre :

1. **Test « no orphans »** (`presets.config.test.ts` — chaque profil doit apparaître comme valeur dans `criterionToPreset`, sinon le test échoue). Ce preset n'est déclenché par aucun critère de scoring existant — il correspond à un état de terrain déclaré par Oscar (« je suis dans un lit de rivière »), pas à une proximité géométrique. **Deux options, à trancher avant d'implémenter** :
   - **(A) Nouveau champ de contexte manuel**, sur le modèle de `soilCondition` (`src/db/types.ts:40`, union fixe `'labour_frais' | 'chaume' | 'prairie' | 'sec' | 'gele' | 'humide'` déclarée par Oscar en début de session) — ajouter une valeur (`'lit_riviere'` ou nouveau champ `terrainFeature`) qui override le preset comme le fait déjà `soilConditionModulation` dans `resolve.ts`. Recommandé : c'est le même mécanisme que `sol_detrempe`/`labour_frais`, déjà testé et compris.
   - **(B) Rattacher à `proximity_source`** une fois `data/derived/hydro_streams.geojson` actif (cf. `docs/PLAN.md` §10 risque 11) — mais alors `proximity_source` pointerait vers `lit_riviere_asseche` au lieu de `moulin_bord_eau`, ce qui est faux pour un moulin/bief permanent (contexte différent : mécanisme + dépôt de crise, pas gué). Nécessiterait de distinguer par un attribut du feature hydro (ex. `nature` du tronçon BD TOPO) plutôt qu'un mapping fixe par critère — plus de travail, pas fait pour cette raison.
2. **Si (A) choisi** : mettre à jour `resolve.test.ts` (`should return all 8 presets` → 9) et `presets.config.test.ts` (`should have exactly 8 profiles with correct IDs` → liste + 1) en même temps que l'ajout du profil — ces deux tests sont des snapshots volontairement stricts, pas des bugs.

## 2. Méthode de recherche rivière — bords vs milieu

Discuté en conversation, pas encore dans `docs/METHODE_TERRAIN.md` (qui documente déjà villages/villa/voie/moulin mais pas de section rivière dédiée) :
- Prioriser les **bords** (zone de passage humain) sur le **milieu** du lit, sauf au gué précis identifié.
- **Berge intérieure des méandres** (côté convexe, dépôt) > berge extérieure (érosion).
- Pièges ponctuels : derrière un obstacle (rocher, racine — le courant ralentit, dépose), fissures de roche affleurante.

Repris dans le `digRule` du preset ci-dessus. À dupliquer dans `docs/METHODE_TERRAIN.md` si une section rivière y est créée — pas fait ici pour rester scope réduit.

## 3. Idée non spécifiée : signaler les structures modernes (buses, ouvrages en béton)

Observation terrain (photo d'une buse de drainage en béton sur le cours d'eau) : ce genre de point n'a aucun intérêt archéologique et pourrait, à terme, être signalé automatiquement à l'utilisateur pour éviter de perdre du temps dessus — sur le modèle du flag `bati` existant (`config/presets.json:161`, `landUseModulation.bati.flag: "inaccessible"`).

**Pas de piste d'implémentation concrète** : aucune source de données publique fiable ne recense les buses/ouvrages agricoles à cette échelle (contrairement au bâti, couvert par le cadastre). Idée notée, pas de spec — nécessiterait soit une saisie manuelle par Oscar (bouton « structure moderne, ignorer » sur la carte), soit d'attendre une source de données pertinente. À rediscuter si le besoin revient.
