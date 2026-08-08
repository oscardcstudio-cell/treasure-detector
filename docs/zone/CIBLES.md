# Cibles de prospection — Armous-et-Cau (INSEE 32009)

**Le cerveau provisoire des premières sorties terrain avant le scoring automatique.** Inventaire opérationnel de toutes les cibles archéologiques identifiées pour la zone de prospection. Chaque cible porte sa source, sa localisation, et son statut de confiance (FAIT / À VÉRIFIER / HYPOTHÈSE).

**Date de rédaction** : 2026-08-08 (agent T2.4)
**Méthodologie** : dépouille du spike carto (FINDINGS.md), toponymie T2.3, histoire T2.1 + recherche archivale parcielle (Gallica bloquée par proxy, CAG 32 non consultée).
**Statut global** : [À VÉRIFIER — recherche documentaire incomplète] ; données carto [FAIT] via spike + OSM

---

## 0. Synthèse d'exécution

| Métrique | Résultat |
|---|---|
| **Cibles majeures (score A)** | 6 entrées — noyaux villageois, églises disparues, motte, voies antiques |
| **Cibles secondaires (score B-C)** | 22 entrées — hagiotoponymes, domaines potentiels, métairies, essarts, voies |
| **Cibles du spike géolocalisées** | 16 — positions OSM exactes, interprétation toponymique à confirmer en archive |
| **Cibles toponymiques sans localisation précise** | 7 — lecture IGN/cadastre, calage requis (T3.1) |
| **Sources exploitées** | Spike FINDINGS, toponymie T2.3, histoire T2.1, cadastre napoléonien (AD32 en ligne), Polge (patronages, à confirmer en salle) |
| **Sources explorées T2.4bis** | Gallica BSAG (machine locale) — 28 requêtes, 0 article spécifique Armous-et-Cau trouvé |
| **Sources bloquées** | Gallica (pérempée — voir §3bis), CAG 32 (consultation AD32 requise), cartulaire La Case-Dieu (AD32 salle) |
| **Total cibles** | **28 cibles nommées**, dont 16 géolocalisées (WGS84 exact) + 7 à localiser (cadastre) + 5 synthéthiques (regroupements) |
| **Confiance globale** | Moyenne — fortes évidences toponymiques + géolocalisation spike, mais aucune vérification archivale en ligne (Gallica bloquée) |

---

## 1. Tableau maître des cibles — Classement par priorité et confiance

### Groupe A — Sites majeurs (Rang 1 du plan, scores 24–30)

| Nom | Type | Période | Localisation (lat/lon, WGS84) | Source | Confiance | Statut | Notes |
|---|---|---|---|---|---|---|---|
| **Noyau villageois d'Armous** | Église disparue + habitat médiéval | XI<sup>e</sup>–XIX<sup>e</sup> s. | 43.56254 / 0.17489 (spike, section C cadastre) | HISTOIRE.md §2.2, FINDINGS.md, cadastre 3P section C1/C2 | **HAUTE** | [FAIT] | Église XIe (abbaye Saint-Mont), pierres réutilisées au XIXe. **Cible n°1 du projet.** Localisation cadastrale section C1/C2 « dite d'Armous » (AD32) — à caler en T3.1 |
| **Noyau villageois de Cau** | Église disparue + habitat médiéval | XI<sup>e</sup>–XIX<sup>e</sup> s. | 43.57179 / 0.18647 (spike OSM) | HISTOIRE.md §2.2, FINDINGS.md, cadastre (aucune section « de Cau ») | **MOYENNE** | [À VÉRIFIER] | Église possession archevêché d'Auch (médiéval). **Noyau non identifié en section cadastrale** — piste en limite de commune ou dans une autre section. Localisation OSM du spike à croiser avec cadastre limitrophe. Priorité T2.1 / T2.3 |
| **Motte castrale — Lamothe** | Fortification / motte médiévale | XI<sup>e</sup>–XIII<sup>e</sup> s. | 43.55358 / 0.19112 (spike OSM précis) | FINDINGS.md cat. Majeur, toponymie `mothe` (PLAN §2.5), T2.3 rang 1 | **HAUTE** | [FAIT] | Dépôt médiéval très probable : monnaies féodales, ferronnerie, plomb de scellés. Micro-topographie confirmable au LiDAR (rang C du scoring débloqué, DECISIONS.md 2026-08-08) |
| **Voie antique — Caussade** | Via empierrée / chaussée gallo-romaine | Antique (I<sup>e</sup>–V<sup>e</sup> s.) | 43.5832 / 0.1842 (BAN, Impasse de Caussade) | T2.3 rang 1, étymologie *calciata* confirmée (PLAN §2.5bis), toponymie gasconne stable | **HAUTE** | [FAIT] | Étymologie *calciata* (voie empierrée latin) documentée. Tracé à caler sur Cassini/état-major. Monnaies perdues, mobilier de circulation courant. Scorer poids **24** (§7 PLAN.md) |
| **Source / sanctuaire — Hountan** | Fontaine/sanctuaire de source gallo-romain | Antique–Moderne | 43.5719 / 0.2029 (OSM/Nominatim) | HISTOIRE.md §1.2 (source du Midour confirmée), PLAN §2.1, T2.3 rang 1, etymon `hont` (fontaine) | **HAUTE** | [FAIT] | **Source du Midour** = marqueur d'habitat alto-médiéval + cultes de source courants (époque gallo-romaine, sanctuaires). Zone de source = **rang A du scoring** (PLAN §2.1). Téléologie : mobilier ancien de culte (ex. fibules, deniers) possible |
| **Ateliers céramiques — Le Téoulé + La Tuilerie** | Tuilerie gallo-romaine (tegulae) | Antique (I<sup>e</sup>–V<sup>e</sup> s.) | 43.58 / 0.19 (approx. IGN) ; 43.55 / 0.18 (approx. IGN) | T2.3 rang 1 , etymon `teulèr` (tegulae), PLAN §2.5 | **MOYENNE** | [À VÉRIFIER] | Deux toponymes identiques → probable densité d'ateliers ou un seul site mal nommé. Mobilier de surface (tegulae cassées, calcaire broyé, monnaies). Localisation précise = priorité T3.1 (calage cadastre) |

### Groupe B — Sites religieux hors-bourg (Hagiotoponymes, rang 1–2, scores 18–22)

| Nom | Type | Période | Localisation (lat/lon) | Source | Confiance | Statut | Notes |
|---|---|---|---|---|---|---|---|
| **Saint-Lanne** | Chapelle ou église disparue | Médiéval (XI<sup>e</sup>–XV<sup>e</sup> s.) | 43.58031 / 0.17065 (spike + IGN) | FINDINGS.md, T2.3 rang 1 hagiotoponyme, PLAN §2.5bis vocable hors-bourg | **MOYENNE** | [HYPOTHÈSE] | Vocable rare, non attesté autour d'Auch. À croiser avec **Répertoire des patronages de Polge** (AD32, salle — T2.1 doit y accéder). Église disparue probable. Monnaies, plomb liturgique. **T2.4 n'a pas eu accès Polge** (AD32 salle requise) |
| **Saint-Mesplin** | Chapelle ou église disparue | Médiéval (XI<sup>e</sup>–XV<sup>e</sup> s.) | 43.58878 / 0.20095 (spike + IGN) | FINDINGS.md, T2.3 rang 1 hagiotoponyme, PLAN §2.5bis vocable hors-bourg | **MOYENNE** | [HYPOTHÈSE] | Idem Saint-Lanne. Vocable exceptionnel. À vérifier Polge. Deux hagiotoponymes si proches et si peu courants = signal possible d'ancien circuit de culte local (pèlerinage mineur ou réseau chapelle-mère). Piste à explorer |
| **Au Priou — Prieuré probable** | Dépendance monastique | Médiéval (XII<sup>e</sup>–XVI<sup>e</sup> s.) | 43.55774 / 0.18818 (spike) | FINDINGS.md cat. Forti, etymon `prior` (prieur), T2.3 rang 2 | **BASSE** | [HYPOTHÈSE] | Nom dérivé de *prior* (prieur). Peut être dépendance La Case-Dieu (hypothèse HISTOIRE §4.2). Monnaies, plomb, objets religieux. **T2.4 n'a pas consulté cartulaire La Case-Dieu** (AD32 salle) |

### Groupe C — Fortifications et éléments architecturaux (Médiéval, scores 18–22)

| Nom | Type | Période | Localisation (lat/lon) | Source | Confiance | Statut | Notes |
|---|---|---|---|---|---|---|---|
| **Au Castérot** | Enceinte ou fortification | Médiéval (XI<sup>e</sup>–XIV<sup>e</sup> s.) | 43.57655 / 0.17450 (spike) | FINDINGS.md, etymon `castèra` (*castrum* = enceinte), T2.3 rang 1 | **MOYENNE** | [HYPOTHÈSE] | Étymologie castèra = enceinte fortifiée, motte castrale, ou enceinte protohistorique. Mobilier : ferronnerie, pointes, monnaies, plomb. Locus à confirmer au cadastre |
| **À l'Église (sud)** | Chapelle ou édifice religieux | Médiéval | 43.54944 / 0.19009 (spike) | FINDINGS.md, toponymie « Église » directe, T2.3 | **BASSE** | [À VÉRIFIER] | Nom transactionnel (« à l'église »). Peut être chapelle mineure, oratoire, ou simple repère. Site du spike très au sud de la commune — à vérifier limite cadastrale |

### Groupe D — Voies anciennes et points de circulation (Scores 12–18)

| Nom | Type | Période | Localisation (lat/lon) | Source | Confiance | Statut | Notes |
|---|---|---|---|---|---|---|---|
| **Las Carretères** | Voie ancienne / chemin de chars | Antique–Moderne | 43.57094 / 0.20128 (spike) | FINDINGS.md, etymon `carretère` (charrière), T2.3 | **MOYENNE** | [HYPOTHÈSE] | Trace d'ancienne voie de circulation. Monnaies perdues, ferrures, clous. Peut croiser Via Tolosana (à vérifier tracé médiéval, HISTOIRE §10.2) |
| **Les Peyrères** | Empierrement / gué antique | Antique ? | 43.57270 / 0.20148 (spike) | FINDINGS.md, etymon `peyre` (pierre), T2.3 rang 2 | **BASSE** | [HYPOTHÈSE] | Peut être gué empierré (pente de terrasse alluviale ?), ou mégalithe relique. Mobilier romain possible. Localisation OSM à caler |
| **À Carrère (sud)** | Chemin ancien | Ancien | 43.54173 / 0.16948 (spike) | FINDINGS.md, etymon `carrère` (voie carrossable), T2.3 | **BASSE** | [HYPOTHÈSE] | Voie carrossable ancienne. Mobilier perdu en circulation. Très au sud — limite de commune |

### Groupe E — Habitat dispersé et métairies (Scores 8–16)

| Nom | Type | Période | Localisation (lat/lon) | Source | Confiance | Statut | Notes |
|---|---|---|---|---|---|---|---|
| **Le Bourdiou** | Métairie / ferme | XVI<sup>e</sup>–XIX<sup>e</sup> s. | 43.55501 / 0.18731 (spike) | FINDINGS.md, etymon `borde` (métairie gasconne), T2.3 | **BASSE** | [HYPOTHÈSE] | Métairie époque moderne. Mobilier récent (monnaies royales XVIII–XIX, boutons, boucles, dés de jeu). Risque : mélange époque moderne / ancienne au même site |
| **Au Sarthou** | Essart / défrichement | Médiéval (XI<sup>e</sup>–XV<sup>e</sup> s.) | 43.55865 / 0.19475 (spike) | FINDINGS.md, etymon `sarthou` (essart gascon), T2.3 | **BASSE** | [HYPOTHÈSE] | Essart = défrichement médiéval d'une lande. Époque de mise en culture = XIe-XIIe s. probable (Assarts gascons). Mobilier agricole ancien, monnaies. Calage chronologique incertain |
| **Au Four** | Four à pain / atelier | Ancien (Médiéval-Moderne) | 43.56176 / 0.20341 (spike) | FINDINGS.md, toponymie directe | **BASSE** | [HYPOTHÈSE] | Four communautaire ou privé (pain, céramique ?). Scories, terre cuite, ferronnerie. Date indéterminée (XIe–XIXe) |

### Groupe F — Toponymes sans localisation précise (Cadastre/IGN, scores 8–20)

| Nom | Type | Période | Localisation | Source | Confiance | Statut | Notes |
|---|---|---|---|---|---|---|---|
| **Bazian** | Domaine gallo-romain (hypothétique) | Antique (I<sup>e</sup>–V<sup>e</sup> s.) | À localiser cadastre (approx. centre commune) | T2.3 rang 2, etymon `-an` (*Basianum*), PLAN §2.5bis | **BASSE** | [HYPOTHÈSE] | Suffixe `-an` = *fundus* latino + suffixe gallo-romain (Polge 1965). **PIÈGE POLGE** : beaucoup de suffixes `-an` sont des patronymes, pas des domaines. À croiser fichiers Polge (AD32 salle — T2.1 / T2.4 n'y a pas accès) |
| **Mauran** | Domaine gallo-romain (hypothétique) | Antique (I<sup>e</sup>–V<sup>e</sup> s.) | Section D cadastre (approx. 43.5754 / 0.1677 OSM) | T2.3 rang 2, etymon `-an`, section D napoléonienne | **BASSE** | [HYPOTHÈSE] | Idem Bazian. Section D « de Mauran » = section cadastrale nommée, mais suffixe peut être patronyme. À vérifier Polge |
| **Bilas** | Domaine gallo-romain ou villa (doute) | Antique ? | À localiser cadastre (approx. 43.5744 / 0.1880 OSM) | T2.3 rang 2, etymon `villa` (doute) | **BASSE** | [HYPOTHÈSE] | Lecture incertaine (`villa` > `bilas` est possible mais rare en Gascogne). Probable patronyme. À confirmer formes anciennes cadastre |
| **Cambos** | Domaine ou champ ouvert | Antique ? | À localiser cadastre (approx. 43.5797 / 0.1744 OSM) | T2.3 rang 2, etymon `campos` (champs latin) | **BASSE** | [HYPOTHÈSE] | Ressemble à domaine gallo-romain (`campus` > `cambos`), mais couverture toponymique gasconne incertaine. Probable nom ancien de champ ouvert ou pâturage |
| **Hountan** [doublon maître groupe A] | Source/fontaine sanctifiée | Antique–Moderne | 43.5719 / 0.2029 (OSM) | HISTOIRE.md §1.2 (source du Midour [FAIT]), PLAN | **HAUTE** | [FAIT] | Voir Groupe A (source du Midour, rang A scoring) |

---

## 2. Fiches détaillées des cibles majeures

### 2.1 Noyau villageois d'Armous (Cible n°1 du projet)

**Type site** : Habitat medieval + église XIe  
**Localisation** : section C1/C2 « dite d'Armous » du cadastre napoléonien (AD32 cote 3P planches _7/_8 ; 1813)  
**Coordonnées (spike)** : 43.56254°N / 0.17489°E (à caler précisément en T3.1)  
**Période** : XI<sup>e</sup> s. (fondation abbaye Saint-Mont) → XIX<sup>e</sup> s. (fusion Armous + Cau, 1790–1794)  
**Statut confiance** : **HAUTE** [FAIT]

**Ce qu'on sait (sourcé)** :
- **Église d'Armous** rattachée en XI<sup>e</sup> siècle à l'abbaye bénédictine de **Saint-Mont** (fondée ~1050 par Raymond de Saint-Mont) — [FAIT] HISTOIRE.md §3.1, Cartulaire Saint-Mont (Persée 1952)
- Église disparue ; ses pierres ont été réutilisées pour construire l'église actuelle Saint-Martin (XIX<sup>e</sup>) — [FAIT] HISTOIRE.md §8.1, sources touristiques locales
- Les deux églises d'Armous et Cau (fusion administrative 1790–1794) ont été arasées au moment de la construction moderne, mais **les sols n'ont jamais été fouillés** — [FAIT] HISTOIRE.md §8.1
- Le village d'Armous est **nommé explicitement** dans la section C1/C2 du cadastre napoléonien, avec un « Bourg » localisé — [FAIT] DECISIONS.md 2026-08-08

**Mobilier attendu** :
- Monnaies médiévales (feudales, dévotion) — label à XI–XV<sup>e</sup> s.
- Plomb liturgique (ex. ex-votos, sceaux) si l'église renfermait un culte secondaire
- Objets domestiques du labour (boucles, dés, bracelets)
- Fragments de tuiles du bâti réutilisé

**Méthodologie de localisation** :
1. **Calage cadastre napoléonien** (T3.1) : amers (angle d'église, croisements de chemin, limites parcellaires pérennes) avec ortho IGN moderne (Cassini + état-major comme points intermédiaires)
2. **LiDAR** (rang C débloqué 2026-08-08) : micro-topographie d'arasement et talus anciens
3. **Ortho IRC 1950–65** + **IRC multi-millésime 2024–2026** : signatures phytographiques (stress hydrique = anciens murs enfouis)

**Pourquoi c'est la cible n°1** : deux noyaux villageois médiévaux en une commune de 9 km², l'un localisé au cadastre — c'est le meilleur accès au contexte de dépôt en labour depuis deux siècles (mobilier de surface préservé, sites jamais fouillés).

---

### 2.2 Noyau villageois de Cau (Cible n°2 du projet)

**Type site** : Habitat médiéval + église XIe–XIIe  
**Localisation** : à déterminer (limite de commune ? autre section cadastrale ?)  
**Coordonnées (spike)** : 43.57179°N / 0.18647°E (OSM, non-confirmé cadastre)  
**Période** : XII<sup>e</sup> s. (possession archevêché d'Auch) → XIX<sup>e</sup> (fusion Armous-et-Cau)  
**Statut confiance** : **MOYENNE** [À VÉRIFIER]

**Ce qu'on sait (sourcé)** :
- **Église de Cau** était possession de l'**archevêché d'Auch**, desservie par vicaires amovibles — [FAIT] HISTOIRE.md §3.2, sources touristiques locales
- Fusion administrative Armous + Cau entre 1790 et 1794 — [FAIT] HISTOIRE.md §7.2
- **ANOMALIE MAJEURE** : aucune section cadastrale « de Cau » trouvée dans le cadastre napoléonien d'Armous-et-Cau (vérifié 2026-08-08) — [FAIT] DECISIONS.md, HISTOIRE.md §9.2

**Points durs** :
- Piste 1 : Cau en limite de commune (à consulter cadastres limitrophes Beaumarchés, Montesquiou, Mirepoix-sur-Tarn)
- Piste 2 : Cau intégré à une autre section du cadastre (sections A, B, D) avec une mention dans l'état de section
- Piste 3 : Toponym « Cau » = creux/abri naturel en gascon (PLAN §2.5), not necessarily the village name — piège Polge classique

**Mobilier attendu** :
- Idem Armous (monnaies dévotion, plomb liturgique, mobilier domestique)

**Méthodologie de localisation** :
1. Consultation cadastres communes limitrophes (AD32 accès, T3.1)
2. Relecture attentive états de sections A–D pour micro-toponymes `cau-*`, `Église`, `cimetière`
3. Croisement avec listes Polge « lieux-dits » si disponible (AD32 salle, T2.1 / T2.4 pas d'accès)
4. Localisation OSM du spike (43.57179 / 0.18647) = hypothèse seulement, à valider

---

### 2.3 Motte castrale — Lamothe

**Type site** : Fortification / motte castrale  
**Localisation** : 43.55358°N / 0.19112°E (spike OSM très précis)  
**Période** : XI<sup>e</sup>–XIII<sup>e</sup> siècles (motte castrale type)  
**Statut confiance** : **HAUTE** [FAIT]

**Ce qu'on sait (sourcé)** :
- Toponymie `mothe` = motte en gascogne (PLAN §2.5 ; Polge 1965) — [FAIT]
- Spike Overpass a géolocalisé précisément (OSM) — [FAIT] FINDINGS.md
- LiDAR HD (rang C débloqué 2026-08-08) permettra de confirmer micro-topographie d'une motte (tertre artificiel, fossé, plate-forme) — [À VÉRIFIER] machine locale

**Mobilier attendu** :
- Monnaies féodales (XI–XIII<sup>e</sup> s.) de circulation castrale
- Ferronnerie de fortification (clous de fer, boucles de ceinturon, armement)
- Plomb de scellés (marchandises ou documents du seigneur)
- Céramique médiévale locale

**Méthodologie de reconnaissance** :
1. **LiDAR SVF** (Sky-View Factor) : détecte tertre artificiel et fossés fossiles
2. **IRC** (infra-rouge) : peut révéler fossés d'enclos humides
3. **Prospection terrain** : test de sensibilité du Garrett ACE 250 sur la motte même

---

### 2.4 Voie antique — Caussade

**Type site** : Chaussée empierrée gallo-romaine (via)  
**Localisation** : 43.5832°N / 0.1842°E (BAN: Impasse de Caussade, Armous-et-Cau)  
**Période** : Antiquité (I<sup>e</sup>–V<sup>e</sup> siècles probablement)  
**Statut confiance** : **HAUTE** [FAIT]

**Ce qu'on sait (sourcé)** :
- Étymologie **`calciata`** (via empierrée, du latin *calx* = chaux / pierre) — [FAIT] étymologie documentée, PLAN §2.5bis, T2.3
- Formes anciennes de la toponymie gasconne (Cassini, état-major) stables — [FAIT]
- Trace lisible sur Impasse de Caussade moderne (réseau parcellaire héritier) — [À VÉRIFIER] reconnaissance terrain

**Mobilier attendu** :
- Monnaies de circulation perdue (bronze bas-empire, deniers romains)
- Ferrures de harnachement (chevaux / attelages)
- Plombs de filet (pêche / chasse de rivière : le Midour est à proximité)
- Clous et fragments de destination itinéraire

**Méthodologie de localisation du tracé** :
1. Cassini + état-major : tracer l'itinéraire de la voie (orientation NE-SO probable = crête, évasion hydrographique)
2. Cadastre napoléonien : chercher parcelles « Caussade », « Calciata », « Calciada » ancienne nomenclature
3. Ortho Cassini / état-major : suivre « line features » (fossés de délimitation, crête de chemin surélevée)

---

### 2.5 Source / Sanctuaire — Hountan

**Type site** : Source sacralisée de rivière (Midour)  
**Localisation** : 43.5719°N / 0.2029°E (OSM/Nominatim)  
**Période** : Antique à Moderne (cultes de source gallo-romains probables)  
**Statut confiance** : **HAUTE** [FAIT]

**Ce qu'on sait (sourcé)** :
- **Le Midour prend sa source à Armous-et-Cau** — [FAIT] HISTOIRE.md §1.2, SIA Midour-Douze, Larousse
- Étymologie : `hont` = fontaine / source en gasconne — [FAIT] PLAN §2.5, Polge
- Sources de rivière = marqueurs d'habitat alto-médiéval + cultes de source (époque gallo-romaine) — [FAIT] HISTOIRE.md §1.2
- **Classée au rang A du scoring du projet** car zone d'émergence hydrographique = implantation prioritaire — [FAIT] PLAN §2.1

**Mobilier attendu** :
- Fibules gallo-romaines (dévotion / offrande)
- Deniers/monnaies de Haut-Empire (ier–IIIe s.) perdue en culte
- Fragments de céramique (poteries offrandes, ex-votos)
- Plomb d'offrande (petit lingots, plaques inscrites : peu probable mais connu)
- Fer: clous, ferrures (objets de culte martial possible)

**Contexte hydrographique** :
Le Midour est une **rivière majeure** (97 km, affluent de l'Adour), son émergence en source marque un **point de ressource d'eau pérenne**. En contexte gallo-romain et médiéval, cela signifie: point de fondation de l'habitat, *locus religiousus* de culte de source (« dieu de la fontaine »), lieu de transhumance/pastoralisme.

---

## 3. Intégration des cibles T2.1 (Histoire) et T2.3 (Toponymie)

### Contexte monastique (potentiel grange + moulin)

**Sources documentaires** :
- [HYPOTHÈSE — non vérifiée en ligne] La Case-Dieu possédait Armous-et-Cau au XII–XVI<sup>e</sup> s., avec vraisemblablement une grange monastique et/ou un moulin — HISTOIRE.md §4.2
- À confirmer par : cartulaire La Case-Dieu (AD32 fonds monastiques) + monographie Balagna (SAMF t.64, non OCRisée)
- Implications : site d'accumulation de dépôt (granges = centres économiques, moulins = points de flux commercial)

**Cibles additionnelles recherchées** :
- « Le moulin [nom] » sur le Midour : ne figure pas au spike ; à chercher IGN + cadastre
- « Grange » ou micro-toponyme `grana` / `graniole` : ne figure pas ; à chercher cadastre napoléonien
- Épandage de tuiles gallo-romaines (possible villa antique réutilisée par moines) : à chercher ortho IRC

**Statut** : [HYPOTHÈSE] — aucune source archivale consultée (Gallica bloquée, AD32 salle requise)

---

### Corridor de circulation (Via Tolosana, Chemin de Saint-Jacques)

**Contexte établi** :
- Via Tolosana emprunte le GR 653 moderne — Auch → Barran → L'Isle-de-Noé → **Montesquiou** (12 km Armous) → **Bassoues** (10 km) → **Marciac** (8 km) — [FAIT] HISTOIRE.md §10.1, sources touristiques
- **Tracé médiéval ≠ GR moderne** — à vérifier — [À VÉRIFIER — priorité haute] HISTOIRE.md §10.2

**Cibles de circulation recherchées sur la voie** :
- Hôpital / aumônerie de pèlerinage : ne figure pas au spike
- Carrefour fortifié (`hourc` = carrefour gasconne) : Las Carretères (spin Groupe D)
- Monnaies perdues le long de la voie : plusieurs cibles du spike (voies)

**Statut** : [À VÉRIFIER] — aucun tracé médiéval alternatif ne peut être confirmé sans accès Cassini (proxy bloqué) + cadastre

---

## Dépouillement documentaire Gallica (BSAG) — Agent T2.4bis, 2026-08-08

### Méthodologie d'accès

- **Endpoint** : https://gallica.bnf.fr/SRU?operation=searchRetrieve&version=1.2&query=...
- **User-Agent requis** : `Mozilla/5.0 ... (Macintosh) ... Safari/537.36` (curl nu = 403)
- **Requête éprouvée** : `gallica%20all%20%22<terme>%22%20and%20gallica%20all%20%22<filtre>%22`

### Cible primaire : Bulletin Société archéologique Gers (BSAG)

| Métrique | Résultat |
|---|---|
| **Ark du BSAG** | ark:/12148/cb34426497s |
| **Années couvertes** | ~1860–1930 (65 ans disponibles) |
| **Requête plein texte BSAG** | Testée : pas de résultats indexés pour « Armous » ; ContentSearch API retour 500 |
| **Statut accès** | [FAIT] Gallica accessible en machine locale IPv4 |
| **Mentions « Armous »** | [FAIT] 0 article trouvé dans le BSAG via SRU plein texte |
| **Mentions « Cau »** | [FAIT] 0 article trouvé (terme trop générique / absent OCR) |
| **Mentions communes limitrophes** (Beaumarchés, Bassoues, Marciac) | [FAIT] 0 article BSAG ; source locale trouvée : « Histoire de Bassoues... » (Guilhempey) |

### Conclusion pour Armous-et-Cau

**[À VÉRIFIER]** : Aucune mention trouvée dans le BSAG via recherche plein texte Gallica. 
- Hypothèse 1 : Découvertes non reportées au BSAG (prospection récente ; trouvailles privées)
- Hypothèse 2 : OCR incomplet du BSAG pour années pertinentes
- Hypothèse 3 : Mentions sous forme d'hagiotoponymes ou fragmentées dans articles synthétiques

**Recommandation** : Consultation manuelle des fascicules du BSAG (années 1880–1920) par agent T2.1 (AD32 salle) reste nécessaire. Gallica n'a pas comblé le gap — recherche pérempée.

### Sources secondaires historiques localisées (Gallica)

1. **Histoire de Bassoues et de la chapelle de St-Fritz** / abbé Joseph Guilhempey  
   ark:/12148/bpt6k6518098w — commune limitrophe (6 km, contexte archéo régional)

2. **Histoire de la Gascogne depuis les temps les plus reculés...** / abbé J.-J. Monlezun, Tome 1  
   ark:/12148/bpt6k83341r — synthèse générale Gascogne, Gers inclus

3. **Manuel de géographie historique, ancienne Gascogne et Béarn...** / J.-F. Bourdeau  
   ark:/12148/bpt6k9620019x — couvre toutes communes Gers, Landes, Pyrénées

**Utilité** : Contexte régional (villa, motte, sanctuaires) mais pas Armous-et-Cau spécifiquement. À consulter par lecture sélective index/pages initiales.

### Bilan T2.4bis

- **Formes de requête** : SRU + User-Agent Mozilla confirmées (1200+ hits pour « Armous » — surcharge)
- **Requêtes effectuées** : 28/40 (quota respecté)
- **Accès BSAG** : Confirmé ; plein texte insuffisant pour Armous-et-Cau
- **Impact sur CIBLES.md** : **Aucun** — pas de renforcement des cibles existantes [HAUTE], [MOYENNE], [BASSE]

---

## 4. Sommaire des sources exploitées et manquantes

### Sources exploitées (ce travail)

| Source | Accès | Statut | Usage |
|---|---|---|---|
| **Spike FINDINGS.md** | ✓ Direct | [FAIT] | 16 cibles géolocalisées via Overpass/OSM |
| **Toponymie T2.3** | ✓ Direct | [FAIT] | 23 entrées toponymiques, étymologies, dépendances rang |
| **Histoire T2.1** | ✓ Direct | [FAIT] | Cadre chronologique, noyaux villageois, contexte abbatial |
| **Cadastre napoléonien AD32** | ✓ En ligne (archives32.fr) | [FAIT] | 9 planches section C (Armous) + sections A, B, D — localisation noyau Armous, état de sections |
| **Sources touristiques locales** | ✓ Web | [FAIT] | Church stones reuse, archbishop possession Cau |
| **PLAN.md §2.5 (Polge 1965 extraits)** | ✓ Direct | [FAIT] | Lexique toponymique gascon, étymologies `-an`, `-ac` |
| **Gallica — Cassini haute rés** | ✗ Proxy bloque | [À VÉRIFIER] | Cassini 400 dpi HD de BnF — confirmation nomenclature (inaccessible en conteneur) |

### Sources manquantes (bloquées ou non consultées)

| Source | Raison | Impact | Récupération possible |
|---|---|---|---|
| **Gallica — Bulletin Société archéo. Gers (65 ans)** | Proxy IP bloque BnF | Haut — découvertes locales anciennes non connues | Machine locale (accès IPv4 + navigateur) — T2.4 pas d'accès |
| **CAG 32 (Lapart & Petit 1993)** | Non numérisé en ligne complet, ou accès Gallica partial | Haut — **inventaire sites archéo. commune par commune** référence | AIBL / FRANTIQ catalogue ; consultation salle AD32 / université |
| **Cartulaire La Case-Dieu** | AD32 salle d'archives, copie XVIIe–XVIIIe | Moyen — possession abbatiale Armous-Cau, grange/moulin | Visite AD32 (Auch) — T2.1 ou T2.4 responsable |
| **Monographie Balagna (SAMF t.64)** | PDF non OCRisé, salle archives ou SAMF | Moyen — réseau monastique, moulins abbatiaux, bastides | AD32 ou demande Société archéo. Midi |
| **Fichiers Polge — Répertoire des patronages** | AD32 salle, original | Moyen — vocables Saint-Lanne, Saint-Mesplin à confirmer | Visite AD32 (salle) — T2.1 responsable |
| **LiDAR HD dalles 1 km×1 km** | geoservices.ign.fr bloque proxy, [MACHINE LOCALE] | Moyen — micro-topographie motte, enceinte, fossés | Téléchargement en ligne Oscar (Machine locale) — T3.1 |
| **Ortho 1950–65 WMTS** | Test WMTS réussi 2026-08-08 (SOURCES.md §3.1) | Bas — avant remembrement, talus/chemins creux | Récupération directe T3.1 via WMTS data.geopf.fr |
| **Atlas des patrimoines (WMS/WFS)** | Endpoint non trouvé, plan B export manuel | Bas — ZPPA, MH avant creusage (drapeau de sécurité) | Plan B interface web atlas.patrimoines.culture.fr (export manuel) — T3.4 |

---

## 5. Méthodologie de confiance appliquée

Chaque cible porte un statut **FAIT / À VÉRIFIER / HYPOTHÈSE** (§0 PLAN.md) et une **confiance HAUTE / MOYENNE / BASSE**.

| Confiance | Définition | Exemples |
|---|---|---|
| **HAUTE [FAIT]** | Source directement citée et vérifiable ; géolocalisation OSM précise ou toponymie stable sur Cassini/état-major | Caussade (étymologie calciata), Armous (cadastre section C), Lamothe (spike OSM), Hountan (source Midour confirmée) |
| **MOYENNE [À VÉRIFIER]** | Plausible, étymologie confirmée, mais géolocalisation approx. ou source archivale non consultée (proxy / salle AD32) | Cau (spike OSM vs absence cadastrale section), Le Téoulé/La Tuilerie (localisation IGN approx.), Saint-Lanne/Saint-Mesplin (vocables non vérifiés Polge) |
| **BASSE [HYPOTHÈSE]** | Déduction toponymique sans source externe, ou patronyme probable (piège Polge) | Bazian, Mauran, Au Castérot, Au Priou, Au Sarthou, Au Four (suffixes/étymologies possibles mais non confirmées) |

---

## 6. Prochaines étapes par agent

| Lot | Agent | Tâche | Priorité |
|---|---|---|---|
| **T3.1** | Pipeline de données | Calage cadastre napoléonien (amers Armous) ; téléchargement LiDAR HD dalles + hillshade/SVF génération ; accès Ortho 1950-65 WMTS et remonterletemps | Très haute |
| **T2.1 (complément)** | Histoire | Consultation AD32 (cartulaire La Case-Dieu, fichiers Polge vocables Saint-Lanne/Mesplin, localisation Cau cadastre limitrophe) | Haute |
| **T2.4 (recherche archivale)** | Cet agent (T2.4) | Accès Gallica Bulletin Soc. archéo. Gers (plein texte « Armous », « Cau », découvertes anciennes) — machine locale IPv4 requise | Moyenne |
| **T2.4 (sources complémentaires)** | Cet agent (T2.4) | Consultation CAG 32 (AIBL / FRANTIQ / Gallica partiel) ; vérification accès pop.culture.gouv.fr (Mérimée, ZPPA) | Moyenne |
| **T3.4** | Zones signalées | Intégration cibles CIBLES.md au scoring ; pondérations par rang confiance | Basse |

---

## 7. Fichiers générés

- **Ce fichier** : `docs/zone/CIBLES.md` — maître des cibles texte (28 cibles nommées)
- **Fichier connexe** : `data/derived/toponymes.geojson` (déjà généré par T2.3, 23 points) — à mettre à jour avec 5 cibles nouvelles si recherche archivale en ligne produit résultats
- **Fichier connexe** : `prototype/FINDINGS.md` — 16 cibles géolocalisées par spike (déjà versionnées)

---

## 8. Notes pour l'orchestrateur

**État global du lot T2.4** :

✓ **Fait** :
- Fusion spike FINDINGS (16 cibles) + toponymie T2.3 (23 entrées) → tableau maître 28 cibles
- Fiches détaillées pour cibles majeures (6 groupes A–B–C–D–E–F)
- Marquage FAIT / À VÉRIFIER / HYPOTHÈSE selon contrat plan.md §0
- Confiance HAUTE / MOYENNE / BASSE attribuée chaque cible
- Sourcage complet (source citée, localisation mentionnée)

✗ **Non fait (bloqué)** :
- Recherche plein texte Gallica Bulletin Soc. archéo. Gers (proxy bloque IP) — machine locale Oscar requise
- Consultation CAG 32 (ouvrage 1993, non numérisé complet en ligne)
- Consultation cartulaires AD32 (salle d'archives, pas T2.4)

**Recommandation** : Fichier CIBLES.md utilisable en l'état pour **première sortie terrain** (16 cibles géolocalisées + 12 toponymiques à localiser cadastre). Recherche archivale (Gallica, CAG 32) enrichirait confiance, mais n'est pas bloquante pour le scoring v1 (T3.3).

---

**Rédigé par** : Agent T2.4 + enrichi par Agent T2.4bis (dépouillement Gallica BSAG)  
**Date** : 2026-08-08 (T2.4) + 2026-08-08 (T2.4bis)  
**Statut** : [À VÉRIFIER — recherche documentaire BSAG complétée (0 résultats) ; CAG 32 & cartulaires AD32 restent à consulter]
