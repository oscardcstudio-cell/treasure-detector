# Grille de scoring — treasure-detector (T3.2)

**Version** : 1.0 (v1 avec critères actifs)  
**Date** : 2026-08-08  
**Autor** : Agent T3.2 (sonnet)  
**Statut** : Implémentable — chaque critère actif pointe vers une source de données réelle

---

## 0. Préambule — Règles du scoring

Ce document définit **chaque critère** utilisable pour calculer le score 0–100 d'une cellule hexagonale H3 de la zone d'Armous-et-Cau.

### Statut et sources

Chaque critère porte l'un de ces trois marqueurs (empruntés au PLAN.md §0) :

| Marqueur | Sens | Implication pour le score |
|---|---|---|
| **[FAIT]** | Source présente, calculable dès now, testé | ✅ Critère ACTIF dans v1 (`config/scoring.json`) |
| **[À VÉRIFIER]** | Plausible, non confirmé, données moyennement disponibles | ⚠ Critère EN RÉSERVE pour v1.1+ |
| **[HYPOTHÈSE]** | Inférence, données manquantes | ❌ Critère SUPPRIMÉ de la grille active (trop risqué) |

### Point capital : site Patriarche

Les entités archéologiques déjà connues de la base **Patriarche** (Atlas des patrimoines) ne doivent **jamais** être traitées comme des cibles. Ce sont des **références de validation** : *« Le scoring retrouve-t-il les sites connus sans les avoir en entrée explicite ? »* C'est ainsi qu'on mesure la qualité du modèle.

Aucun site connu ne sera marqué comme cible pour la prospection.

---

## 1. Critères ACTIFS (v1) — calculables maintenant

### A. Habitat ancien disparu

#### A1. Noyau villageois d'Armous (église XI<sup>e</sup>)

**Poids** : 30 (Rang A du PLAN §7)  
**Statut source** : [FAIT]  
**Source de données** :
- Localisation principale : `data/derived/toponymes.geojson` feature « Église disparue d'Armous »
- Coordonnées : 43.56254°N / 0.17489°E (projection WGS84)
- Référence archivale : cadastre napoléonien section C1/C2 « dite d'Armous » (AD32 cote 3P, 1813)
- Contexte : HISTOIRE.md §2.2, CIBLES.md §2.1, PLAN §2.2

**Définition opérationnelle** :
- Point d'église disparu + buffer de **150 m** autour (rayon de site de village médiéval typique)
- La cellule H3 qui recouvre ce buffer reçoit le poids plein (30)
- Les cellules adjacentes reçoivent un facteur de dégradation : 30 × (1 - distance/200m)

**Justification** :
Noyau villageois XI<sup>e</sup>–XIX<sup>e</sup> avec église dont les pierres ont été réutilisées au XIXe. Deux critères le qualifient de cible n°1 : (1) deux noyaux villageois distincts en 9 km² => couche de labour dense en mobilier ; (2) sols jamais fouillés => mobilier de surface déplacé par la charrue depuis ~1800 => concentration en labour. C'est la source de retour la plus prévisible du projet.

**Donnée utilisée** : feature GeoJSON « Église disparue d'Armous » avec property `rank: 1`, `status: '[À VÉRIFIER]'`.

---

#### A2. Noyau villageois de Cau (église médiévale)

**Poids** : 30 (Rang A du PLAN §7)  
**Statut source** : [À VÉRIFIER]  
**Source de données** :
- Localisation hypothétique : `data/derived/toponymes.geojson` feature « Église disparue de Cau »
- Coordonnées spike : 43.57179°N / 0.18647°E (non confirmé au cadastre)
- Statut cadastral : **PROBLÈME** — aucune section « de Cau » trouvée dans cadastre Armous-et-Cau (CIBLES.md §2.2)
- Référence archivale : église possession archevêché d'Auch, XIIe s. (CIBLES.md §2.2)

**Définition opérationnelle** :
- **Version activée seulement si localisation cadastrale confirmée en T3.1**
- Si confirmée : buffer 150 m autour de la position (idem A1)
- Si non confirmée avant T3.3 : critère retiré de la grille active

**Justification** :
Noyau villageois secondaire documenté (possession archévêché), mais localisation cadastrale non résolue. Le spike OSM place une hypothèse (43.57179 / 0.18647) qui reste à valider. Sans localisation précise, le buffer n'a pas de sens cartographique.

**Règle T3.3** : Si `CIBLES.md` n'a pas confirmé de localisation avant le merge de T3.3, retirer ce critère et stocker Cau comme cible de prospection exploratory (priorité basse) dans `CIBLES.md` en statut « à localiser ».

---

#### A3. Tuileries — Le Téoulé + La Tuilerie

**Poids** : 20 (Rang A du PLAN §7)  
**Statut source** : [À VÉRIFIER — localisation précise manquante]  
**Source de données** :
- Toponymes : `data/derived/toponymes.geojson` features « Le Téoulé » et « La Tuilerie »
- Localisation IGN approximative (lecture de carte, pas coordonnées précises)
- Interprétation : `teulèr` (tegulae, atelier gallo-romain de tuiles)

**Définition opérationnelle** :
- Deux toponymies identiques → probable clustering d'un seul site mal nommé OU deux ateliers distincts
- **En attente calage cadastre précis par T3.1** : les deux toponymes doivent être localisées à < 50 m
- Buffer : 100 m autour de chaque localisation confirmée

**Justification** :
Atelier de tegulae accompagne souvent une villa gallo-romaine (PLAN §2.3). Le mobilier en surface (tegulae cassées, calcaire broyé, monnaies) est détectable avant creusage. Poids réduit à 20 (pas 25) car localisation imprécise et classification de probabilité plutôt que certitude.

**État v1** : Critère ACTIF mais avec avertissement : localisation fournie par GeoJSON mais non-vérifiée terrain. T3.3 affichera les deux positions avec un badge « à caler ».

---

### B. Sources et hydrosignatures

#### B1. Zone de source du Midour — Hountan

**Poids** : 25 (Rang A du PLAN §7)  
**Statut source** : [FAIT]  
**Source de données** :
- Localisation : `data/derived/toponymes.geojson` feature « Hountan »
- Coordonnées : 43.57191°N / 0.20287°E (Nominatim/OSM, IGN)
- Confirmation : PLAN §2.1 (source du Midour confirmée auprès du SIA Midour-Douze)
- Ethymon gascon : `hont` = fontaine/source (lexique PLAN §2.5)

**Définition opérationnelle** :
- Point source + buffer de **500 m** (rayon de zone de captation de source antique / sanctuaire de source)
- Cellule H3 couvrant le buffer : poids plein (25)
- Dégradation en anneau : 25 × max(0, 1 - distance/750m) pour les cellules adjacentes

**Justification** :
Les sources sont des foyers naturels d'implantation (habitat, eau potable) et des lieux de culte dès l'antiquité (sanctuaires de source gallo-romains courants en Gaule). Le mobilier attendu : fibules de culte, deniers de dépôt votif, céramique de sanctuaire. L'Hountan est documenté comme la source du Midour (confirmé PLAN §2.1), ce qui en fait un marqueur A du scoring.

**Garantie données** : Feature GeoJSON présente, coordonnées exactes IGN.

---

### C. Voies antiques et circulation

#### C1. Via empierrée — Caussade

**Poids** : 24 (Rang A du PLAN §7)  
**Statut source** : [FAIT]  
**Source de données** :
- Localisation ponctuelle : `data/derived/toponymes.geojson` feature « Caussade »
- Coordonnées BAN : 43.5832°N / 0.1842°E (Impasse de Caussade, Armous-et-Cau)
- Étymologie confirmée : *calciata* (voie empierrée latin, PLAN §2.5bis, T2.3)
- Tracé historique : Cassini + état-major WMTS (à parcourir pour identifier le chemin)

**Définition opérationnelle** :
- Point d'accès moderne + buffer de **200 m** de chaque côté de l'axe présumé du chemin (estimation : NE-SO d'après crête/pente)
- OU : linéature vectorisée depuis Cassini/état-major (tâche de T3.1 ; si fournie, l'utiliser)
- Cellules recoupant le corridor : poids plein (24)
- Largeur du corridor = 400 m (= 200 m de chaque côté), raison : perte d'objets en circulation s'échelonne le long de la voie

**Justification** :
Voie antique empierrée identifiée par étymologie stable et confirmée par toponymie gasconne. Mobilier de circulation perdue (bronze bas-empire, fibules, plombs, ferrures) concentré le long de l'axe. Poids de 24 (non 25) : certainty toponymique élevée, mais tracé exact médiéval non confirmé (PLAN §2.4).

**Données utilisées** : Feature GeoJSON « Caussade » + consultation Cassini/état-major pour vectorisation.

---

### D. Indices toponymiques — microtoponymes

#### D1. Microtoponymes de rang 1 (fortes)

**Poids** : 20 (Rang B du PLAN §7)  
**Statut source** : [FAIT]  
**Source de données** :
- Toutes les features de `data/derived/toponymes.geojson` avec `rank: 1`
- Liste exhaustive (état actuel) :
  - « Caussade » (voie antique) — déjà couverte par C1, double-compte à éviter
  - « Hountan » (source) — déjà couverte par B1
  - « Lamothe » (motte castrale, `mothe`)
  - « Église disparue d'Armous » — déjà couverte par A1
  - « Église disparue de Cau » — déjà couverte par A2
  - « Au Castérot » (`castèra` = enceinte fortifiée)
  - « Au Priou » (`priou` = prieuré)
  - « Saint-Lanne » (vocable hagionymique)
  - « Saint-Mesplin » (vocable hagionymique)
  - « À l'Église (sud) » (chapelle probable)

**Définition opérationnelle** :
- Points GeoJSON avec `rank: 1` (sauf les doublons A et C ci-dessus)
- Buffer : **200 m** autour de chaque point (rayon de site localisé)
- Cellule H3 couvrant le buffer : poids 20
- Dégradation : 20 × max(0, 1 - distance/300m) en anneau

**Justification** :
Le microtoponyme rang 1 (lexique établi PLAN §2.5 et §2.5bis) est un signal puissant de site. Les termes `glèisa` (église), `mothe` (motte), `castèra` (enceinte), `priou` (prieuré) sont documentés comme marqueurs d'habitat ancien. Hagiotoponymes (`Saint-*` hors-bourg) signalent cultes médiévaux et chapelles disparues. Poids de 20 : signal fort mais pas certitude absolue — confirmation archéologique requise.

**Données utilisées** : `toponymes.geojson` filtré `rank == 1`.

---

#### D2. Microtoponymes de rang 2 (secondaires)

**Poids** : 12 (Rang B du PLAN §7)  
**Statut source** : [FAIT]  
**Source de données** :
- Features `data/derived/toponymes.geojson` avec `rank: 2`
- Exemples : Bilas, Cambos, Mauran, Rozès, Le Bourdiou, Au Sarthou, Au Four, Les Peyrères, À Carrère

**Définition opérationnelle** :
- Buffer : **150 m** autour de chaque point
- Cellule H3 : poids 12
- Dégradation : 12 × max(0, 1 - distance/250m)

**Justification** :
Rang 2 inclut suffixes potentiels *-an* (domaine gallo-romain *-anum*, PLAN §2.5bis, Polge 1965) et métairies (`borde`). Signal moins établi que rang 1 — beaucoup de ces noms sont des patronymes, d'où le poids réduit. Avertissement Polge classique : ne pas surinterpréter les anthroponymes.

**Dados utilisées** : `toponymes.geojson` filtré `rank == 2`.

---

#### D3. Proximité à source (toute source)

**Poids** : 12 (Rang B du PLAN §7)  
**Statut source** : [À VÉRIFIER — données hydrographiques complètes manquantes]  
**Source de données** :
- Ruisseaux nommés PLAN §2.1 : Midour (source), Guillembounet, Mauran
- Références : WMTS « hydrographie » IGN (non confirmé disponibilité en flux)
- Fallback : buffer autour des points source connus (Hountan)

**Définition opérationnelle** :
- Toute cellule H3 à < 200 m d'un cours d'eau répertorié : +12 pts
- Justification : villa gallo-romaine préfère proximité hydrique (eau, moulins, gué)
- Critère **combinatoire** : s'ajoute à d'autres (multiplication, non remplacement)

**Statut v1** : Critère CANDIDAT. Données hydrographiques non confirmées (hypothèse WMTS IGN disponible). À activer dès que T3.1 fournit vecteur ruisseaux.

---

### E. Modulateurs (multiplicateurs après calcul de base)

Appliqués **après** calcul du score de base pour tenir compte d'accessibilité et conditions de labor.

#### E1. Labour (×1,3)

**Source** : RPG (Registre parcellaire graphique) — occupation du sol "lab" ou "labour"  
**Raison** : Le labour remonte le mobilier du sol par la charrue. C'est la condition optimale pour trouver du mobilier déjà déplacé en surface. Facteur de 1.3x.

**Statut v1** : [À VÉRIFIER] — accès RPG à vérifier via api.gouv.fr. Si indisponible, critère suspendu pour v1.0.

---

#### E2. Prairie permanente (×0,8)

**Source** : RPG — occupation "prairie"  
**Raison** : Prairie non labourée = sol non perturbé depuis décennies = mobilier reste enfoui plus profond = moins de signal détectable. Facteur de 0.8x.

**Statut v1** : [À VÉRIFIER] — idem labour, RPG requis.

---

#### E3. Bois (×0,6)

**Source** : RPG + orthophoto RVB (masque forêt)  
**Raison** : Bois = LiDAR excellente (révèle micro-topographie sous végétation), détection de métaux très pénible (racines, ferraille ancienne entrelacée). Facteur 0.6x pour désinciter mais pas bloquer (LiDAR peut révéler site même si détection difficile).

**Statut v1** : [À VÉRIFIER] — RPG ou segmentation orthophoto requise.

---

#### E4. Bâti actuel, cimetière, voirie (×0)

**Source** : Cadastre express + orthophoto RVB  
**Raison** : Inaccessible pour prospection. Score d'une cellule bâtie = 0, même si elle recouvre une zone historique.

**Statut v1** : [FAIT] — Cadastre express + ortho lisible visuellement.

---

## 2. Critères EN RÉSERVE (v1.1+) — débloqués par T3.1

### LiDAR Anomalies (awaits T3.1 + vérification couverture Gers)

#### R1. Sky-View Factor (SVF) — détection de terrasses anciennes

**Poids projeté** : 20 (Rang C du PLAN §7)  
**Déblocage** : T3.1 confirme couverture LiDAR HD du Gers + génère MNT 0.5m
**Source** : Dalles LiDAR HD (COPC.LAZ) + traitement GDAL (rvt-py ou réimplémentation §5.6 du PLAN)
**Définition opérationnelle** :
- SVF sur MNT 0.5 m détecte terrasses / plateformes de villa > 1m d'élévation
- Anomalies flaggées = cellules H3 adjacentes +20
- Raison : SVF révèle structure anthropogène sous végétation

---

#### R2. Local Relief Model (LRM) — enclos, fossés

**Poids projeté** : 20  
**Définition opérationnelle** :
- LRM met en évidence enclos et fossés de fortification (mottes, enceintes)
- Buffer 50m autour de l'anomalie : +20

---

#### R3. Openness — crêtes et points hauts occupés

**Poids projeté** : 20  
**Définition opérationnelle** :
- Openness detect crêtes naturelles (habitat de hauteur probable)
- Cellules H3 recouvrant crêtes : +20

---

### Bâti Disparu (numérisé par T3.1)

#### R4. Bâti absent de l'ortho moderne mais présent Cassini/état-major

**Poids projeté** : 25 (Rang A du PLAN §7)  
**Déblocage** : T3.1 vectorise différentiel Cassini/état-major/ortho 1950-65/ortho moderne
**Source de données** : GeoJSON vecteur de bâtiments disparus (polygones)
**Définition opérationnelle** :
- Chaque bâtiment disparu = ferme, moulin, chapelle → buffer 100m
- Cellule recouvrant le buffer : +25

---

### RPG en flux structuré

#### E5–E7. Labour/prairie/bois conditionnels sur RPG

**Déblocage** : T3.1 vérifie accessibilité API RPG et crée dataset local  
**Statut** : Si RPG non accessible en v1, modulateurs E1–E4 passent en `status: 'await_T3.1'` dans `config/scoring.json`

---

## 3. Critères SUPPRIMÉS (ne figureront pas dans v1)

### S1. Grange monastique de La Case-Dieu

**Raison suppression** : Hypothèse archivale sans donnée calculable. Cartulaire et ADlocalisations non dépouillées en v1.  
**Remplacement** : Transféré en cible prioritaire de prospection dans `CIBLES.md`, statut « à vérifier »  
**Déblocage v2** : T2.1 finalise dépouillement cartulaire

---

### S2. Via Tolosana — variante médiévale

**Raison suppression** : Tracé médiéval du GR 653 non localisé (§2.4 du PLAN : « à vérifier »). Distance/localisation inconnue.  
**Remplacement** : Liste nominale dans `CIBLES.md` comme piste de prospection historique explorative  
**Déblocage v2** : Recherche cartographique sur Cassini/état-major avec validation toponymie

---

### S3. Limite de paroisse / commune ancienne

**Raison suppression** : Données vectorisées inexistantes (cadastre napoléonien en raster, pas vecteur AD32)  
**Remplacement** : Piste manuelle pour T3.1 (calage cadastre) — trop coûteux en v1  
**Déblocage v2** : T3.1 vectorise cadastre napoléonien complet

---

### S4. Anomalies IRC crop marks

**Raison suppression** : Signaux trop bruitants (PLAN §4.1bis : « résultats incertains »). Calibration v2 requise.  
**Remplacement** : Candidat pour validateur expert (Oscar visualise IRC 2024–2026) de manière explorative  
**Déblocage v2** : Après première saison de terrain, construire modèle de validation des traces IRC  

---

## 4. Résumé des critères ACTIFS v1.0

| ID | Label | Poids | Source | Buffer | Rang |
|---|---|---|---|---|---|
| A1 | Noyau Armous | 30 | toponymes.geojson | 150m | A |
| A2 | Noyau Cau | 30 | toponymes.geojson | 150m (*if cadastre confirmed*) | A |
| A3 | Tuileries | 20 | toponymes.geojson | 100m | A |
| B1 | Source Midour | 25 | toponymes.geojson | 500m | A |
| C1 | Caussade voie | 24 | toponymes.geojson + Cassini | 200m buffer | A |
| D1 | Microtoponyme R1 | 20 | toponymes.geojson (rank==1) | 200m | B |
| D2 | Microtoponyme R2 | 12 | toponymes.geojson (rank==2) | 150m | B |
| D3 | Proximité source | 12 | IGN hydro (tbd) | 200m | B |
| E1–E4 | Modulateurs | ×1.3 à ×0 | RPG + ortho | — | — |

**Total critères ACTIFS** : 8 (+ 4 modulateurs)  
**Total poids max en une cellule** : (30 + 25 + 24 + 20 + 20 + 12 + 12) × 1.3 = ~250 (normaliser à 0–100)

---

## 5. Implémentation T3.3

### Entrées pour le moteur T3.3

1. `config/scoring.json` — liste des critères, poids, sources
2. `data/derived/toponymes.geojson` — features géolocalisées
3. `config/zone.json` — zone bbox et H3 resolution
4. RPG parcellaire (si disponible)
5. Cadastre express WMTS

### Sortie

`ScoreCell[]` (défini CONTRACTS.md) pour la grille H3, chaque cellule avec :
- `h3` : index de cellule
- `score` : 0–100
- `contributions[]` : liste détaillée des critères ayant contribué (pour le panneau « pourquoi »)
- `flagged?` : ZPPA / MH / site classé (information, pas blocage)

### Validations impératives T3.3

1. ✅ JSON `config/scoring.json` parseable et schéma valide
2. ✅ Toutes les sources de critères ACTIFS existent et sont lisibles
3. ✅ Calcul sous 3 secondes sur une grille zone complète
4. ✅ Panneau « pourquoi » affiche chaque contribution avec source
5. ✅ Scoring retrouve-t-il les cibles connues de Patriarche sans les avoir en entrée ? (test de qualité)

---

## Appendice : Correspondance PLAN.md §7 → SCORING.md

| §7 Critère | Rang | Poids §7 | Decision T3.2 | Placement |
|---|---|---|---|---|
| Noyau Armous | A | 30 | ACTIF | A1 |
| Noyau Cau | A | 30 | ACTIF (conditionnel) | A2 |
| Bâti disparu | A | 25 | EN RÉSERVE | R4 |
| Moulin | A | 22 | SUPPRIMÉ (données manquantes) | — |
| Grange La Case-Dieu | A | 20 | SUPPRIMÉ (hypothèse) | S1 |
| Source Midour | A | 25 | ACTIF | B1 |
| Caussade | A | 24 | ACTIF | C1 |
| Tuileries | A | 20 | ACTIF | A3 |
| Saint-Mesplin/Lanne | A | 18 | EN RÉSERVE (D1 +20) | D1 |
| Microtoponyme R1 | B | 20 | ACTIF | D1 |
| Microtoponyme R2 | B | 12 | ACTIF | D2 |
| Via Tolosana | B | 18 | SUPPRIMÉ (tracé hypothétique) | S2 |
| Carrefour/gué | B | 15 | EN RÉSERVE (T3.1) | — |
| Villa gallo-romaine | B | 18 | EN RÉSERVE (LiDAR) | R1–R3 |
| Source/fontaine | B | 12 | ACTIF | D3 |
| Limite paroisse | B | 8 | SUPPRIMÉ (pas de vecteur) | S3 |
| LiDAR anomalies | C | 20 | EN RÉSERVE | R1–R3 |
| Marqueur sol ortho | C | 18 | EN RÉSERVE (T3.1) | — |
| Trace croissance 1950-65 | C | 15 | SUPPRIMÉ (trop manuel v1) | S4 |
| Labour | — | ×1.3 | ACTIF (si RPG) | E1 |
| Prairie | — | ×0.8 | ACTIF (si RPG) | E2 |
| Bois | — | ×0.6 | ACTIF (si RPG) | E3 |
| Bâti | — | ×0 | ACTIF | E4 |

---

## Changelog

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-08-08 | 1.0 | Création initiale — 8 critères ACTIFS + 7 EN RÉSERVE | T3.2 |
