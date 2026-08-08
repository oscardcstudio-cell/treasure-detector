# Sources de données — Armous-et-Cau (INSEE 32009)

Inventaire opérationnel de toutes les sources exploitables pour la prospection et l'analyse du secteur. Ce document est destiné aux lots **T3.1** (pipeline de données) et **T3.4** (zones signalées). Chaque source est vérifiée [FAIT] / [À VÉRIFIER] / [HYPOTHÈSE], avec procédure d'accès concrète.

**Date d'inventaire** : 2026-08-08
**Zone** : Armous-et-Cau (Gers 32230, INSEE 32009, 43.5742°N / 0.1908°E, 9,33 km²)
**Clé de lecture** : voir §0 du [PLAN.md](../PLAN.md) — [FAIT] = sourcé/testé utilisable ; [À VÉRIFIER] = plausible non confirmé ; [HYPOTHÈSE] = inférence sans source

---

## Tableau récapitulatif

| Source | Contenu utile | Format/Protocole | Statut | Accessibilité | Attribution |
|--------|---|---|---|---|---|
| **Cartes anciennes** |
| Cassini (BnF, 1756–1815) | Bâti, moulins, chapelles, chemins | WMTS `BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI` | [FAIT] | data.geopf.fr, z6–14 | Etalab 2.0 / IGN |
| État-major (1820–1866) | Habitats, voies, parcellaire | WMTS `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` | [FAIT] | data.geopf.fr, z6–15 | Etalab 2.0 / IGN |
| **Orthophotos modernes** |
| Ortho RVB courante | Marqueurs de sol, accès, bâti | WMTS `ORTHOIMAGERY.ORTHOPHOTOS` | [FAIT] | data.geopf.fr, z0–19 | Etalab 2.0 / IGN |
| Ortho très haute résolution | 10–20 cm GSD, détails fins | WMTS `THR.ORTHOIMAGERY.ORTHOPHOTOS` | [FAIT] | data.geopf.fr, z6–21 | Etalab 2.0 / IGN |
| Ortho infrarouge (IRC) | **Traces phytographiques**, humidité | WMTS `ORTHOIMAGERY.ORTHOPHOTOS.IRC` | [FAIT] | data.geopf.fr, z6–19 | Etalab 2.0 / IGN |
| **Ortho multi-millésime (analyseur temporel)** |
| IRC 2024, 2025, 2026 | Comparaison année à année, crop marks saisonniers | WMTS `ORTHOIMAGERY.ORTHOPHOTOS.IRC-EXPRESS.{2024,2025,2026}` | [FAIT] | data.geopf.fr | Etalab 2.0 / IGN |
| RVB Express 2025, 2026 | Idem, canal visible | WMTS `ORTHOIMAGERY.ORTHOPHOTOS.RVB-EXPRESS.{2025,2026}` | [FAIT] | data.geopf.fr | Etalab 2.0 / IGN |
| Ortho Express 2024 | Avant remembrement / modifications | WMTS `ORTHOIMAGERY.ORTHOPHOTOS.ORTHO-EXPRESS.2024` | [FAIT] | data.geopf.fr | Etalab 2.0 / IGN |
| **Orthophotos historiques** |
| Ortho 1950–1965 | Avant remembrement, talus, chemins creux | **WMTS `ORTHOIMAGERY.ORTHOPHOTOS.1950-1965`** (PM, png) | **[FAIT — GetTile 200 sur la zone]** | Flux direct dans l'app ; remonterletemps en plan B | Etalab 2.0 / IGN |
| **Relief et terrain** |
| LiDAR HD (MNT 0,5 m) | Micro-topographie, anomalies de terrain | COPC.LAZ, dalles 1 km×1 km | [À VÉRIFIER] | geoservices.ign.fr/lidarhd — **[MACHINE LOCALE]** | Etalab 2.0 / IGN |
| **Parcellaire et usage des terres** |
| Cadastre Express (parcelles actuelles) | Délimitations de parcelles, repérage terrain | WMTS `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` | [FAIT] | data.geopf.fr | Etalab 2.0 / IGN |
| RPG (Registre parcellaire graphique) | Cultures déclarées, distinguer labour/prairie | Open data, flux ou téléchargement | [HYPOTHÈSE] | api.gouv.fr/api/rpg ; commune INSEE 32009 | MAAF / Open data |
| **Archives historiques** |
| Cadastre napoléonien (AD32) | États de sections, plans 1/2500 (1813–1819), toponymie ancienne | Images zoomables, visionneuse | [FAIT] | archives32.fr — portail fonds numérisés | Domaine public |
| Fichiers Polge (AD32) | Dictionnaire topographique, dictionnaire archéologique, patronages | Salle de lecture (original) + recherche en ligne | [FAIT] | AD32 (Auch) ; Répertoire des patronages : persee.fr/doc/rio | Domaine public |
| **Patrimoine et archéologie** |
| Atlas des patrimoines (Patriarche) | Entités archéologiques, ZPPA, monuments historiques, opérations | Export manuel (aucun WMS/WFS public confirmé — testé 2026-08-08) | [À VÉRIFIER via navigateur] | atlas.patrimoines.culture.fr | Public |
| Gallica / BnF — Cassini HD | Feuille Cassini haute résolution (400 dpi, BnF) | Image zoomable + PDF | [À VÉRIFIER] | gallica.bnf.fr/selections/carte-de-cassini — **[MACHINE LOCALE]** | Public / BnF |
| CAG 32 (Carte archéologique de la Gaule) | **Inventaire sites archéologiques par commune**, Lapart & Petit 1993 | Ouvrage imprimé (354 p.) ± partiellement sur Gallica | [À VÉRIFIER] | AIBL (en ligne), FRANTIQ, Gallica : gallica.bnf.fr/.../selections/carte-archeologique | Public |
| Bulletin de la Société archéologique du Gers | 125 ans de signalements de découvertes locales | Numérisé (65 années en ligne) | [FAIT] | gallica.bnf.fr/ark:/12148/cb34426497s/date ; Internet Archive | Public |
| Monographie — Abbaye de La Case-Dieu | Contexte monastique (réseau de granges, moulins, bastides) | PDF (Mém. Soc. archéo. Midi, t.64) | [FAIT] | societearcheologiquedumidi.fr/_samf/memoires/t_64/balagna.pdf | Public |
| **Géologie et sols** |
| BRGM InfoTerre | Molasse gersoise, terrasses alluviales, substrat | Cartes géologiques 1/50000 | [HYPOTHÈSE] | infoterre.brgm.fr (requête par commune) | Open data / BRGM |
| **Météorologie historique** |
| Open-Meteo (ERA5-Land) | Précipitations, humidité du sol depuis 1940 | API REST JSON | [FAIT] | open-meteo.com/en/docs/historical-weather-api (gratuit, 10k appels/j) | ERA5/Copernicus |
| **Ressources linguistiques et toponymie** |
| DicoTopo (CTHS) | Version numérique des dictionnaires topographiques départementaux (Gers) | Recherche web | [HYPOTHÈSE] | dicotopo.cths.fr | Public / CTHS |
| **Sources humaines** |
| Exploitant agricole de la zone | Connaissance empirique du terrain (tuilerie, labours anciens) | Visite terrain, entretien | [HYPOTHÈSE] | À identifier par Oscar | — |
| Société archéologique, historique, littéraire et scientifique du Gers | Mémoire locale, découvertes anciennes non publiées | Correspondance, adhésion | [HYPOTHÈSE] | Auch (tél. société) ; site web | — |
| Mairie et anciens d'Armous-et-Cau | Localisation ancienne églises, souvenirs fondations, micro-toponymie | Visite, entretien | [HYPOTHÈSE] | Mairie (95 hab., tous se connaissent) | — |

---

## Détail des sources

### 1. Cartes anciennes (§4.1 du PLAN.md)

#### 1.1 Carte de Cassini (1756–1815)

**Contenu** : Bâti, moulins, chapelles, chemins du XVIII<sup>e</sup> s., géométrie parcellaire.

**Identifiant WMTS** : `BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI` (préfixe `BNF-IGNF_` requis ; sans lui : erreur 404)

**Détail technique** :
- Format : image/png
- TileMatrixSet : `PM` (Web Mercator, EPSG:3857)
- Zoom natif : z6–14 (plafonne à z14 ; au-delà : pas de tuile native → prévoir `maxNativeZoom: 14`)
- Template REST GetTile : `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`
- Renumérisée à **400 dpi** depuis l'exemplaire BnF en novembre 2024 ([geoservices.ign.fr/actualites](https://geoservices.ign.fr/actualites/2024-11-carte-de-cassini))

**Statut** : [FAIT] — GetCapabilities vérifiée, tuiles test réussies (spike prototype 2026-08-08)

**Attribution** : Etalab 2.0 / © IGN

**Accès** : data.geopf.fr (WMTS direct, public, sans authentification)

**Gotcha** : Proxy Claude Code bloque data.geopf.fr → tâches `[MACHINE LOCALE]` uniquement (vérifier sur Mac local ou preview Railway)

---

#### 1.2 Carte d'État-major (1820–1866)

**Contenu** : Positions d'habitats, voies, parcellaire. Plus précis que Cassini, antérieur au remembrement.

**Identifiant WMTS** : `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40`

**Détail technique** :
- Format : image/jpeg
- TileMatrixSet : `PM`
- Zoom : z6–15
- Template : idem Cassini, remplacer `LAYER=GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40&FORMAT=image/jpeg`

**Statut** : [FAIT] — GetCapabilities vérifiée, tuiles test réussies

**Attribution** : Etalab 2.0 / © IGN

**Accès** : data.geopf.fr (WMTS, public)

**Gotcha** : Idem Cassini (proxy)

---

### 2. Orthophotos modernes (WMTS, §4.1)

#### 2.1 Orthophoto RVB courante (« BD ORTHO »)

**Contenu** : Marqueurs de sol, bâti, accès parcellaire, végétation.

**Identifiant WMTS** : `ORTHOIMAGERY.ORTHOPHOTOS`

**Détail technique** :
- Format : image/jpeg
- TileMatrixSet : `PM`
- Zoom : z0–19
- Template : `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg`
- Résolution variable (20–10 cm selon date ; millésimes dans les métadonnées)

**Statut** : [FAIT]

**Attribution** : Etalab 2.0 / © IGN – BD ORTHO® V3

**Accès** : data.geopf.fr

---

#### 2.2 Orthophoto très haute résolution (THR)

**Contenu** : 10–20 cm GSD ; détails fins sur marqueurs critiques (petites tegulae, limites anciennes).

**Identifiant WMTS** : `THR.ORTHOIMAGERY.ORTHOPHOTOS`

**Détail technique** :
- Format : image/jpeg
- TileMatrixSet : `PM`
- Zoom : z6–21
- Couverture inégale (régions à densité d'acquisition vérifiée)

**Statut** : [FAIT]

**Attribution** : Etalab 2.0 / © IGN

**Accès** : data.geopf.fr

**Note** : À vérifier si Armous-et-Cau est couvert à z21 complet (zones rurales peu prioritaires) ; sinon z18–19 disponible.

---

#### 2.3 Orthophoto infrarouge (IRC, **détecteur de traces phytographiques**)

**Contenu** : **Proche infrarouge, fausses couleurs (NIR), détecte les structures enfouies par différentiel hydrique** — technique publiée et reconnue en archéologie télédétection ([Springer, Near-Infrared Aerial Crop Mark Archaeology](https://link.springer.com/article/10.1007/s10816-011-9104-5)).

**Identifiant WMTS** : `ORTHOIMAGERY.ORTHOPHOTOS.IRC`

**Détail technique** :
- Format : image/jpeg (fausses couleurs : R=NIR, G=RG, B=B)
- TileMatrixSet : `PM`
- Zoom : z6–19
- Interprétation : structures humides = bleu/violet foncé en IRC ; stress hydrique = rouge/orange clair

**Statut** : [FAIT]

**Attribution** : Etalab 2.0 / © IGN

**Accès** : data.geopf.fr

**Portée** : Non une baguette magique (littérature note résultats « incertains »), mais un indice de plus, gratuit, déjà servi en WMTS. À traiter comme canal supplémentaire, pas preuve.

---

#### 2.4 Orthophoto infrarouge multi-millésime (IRC-EXPRESS, **élément clé**)

**Contenu** : **Comparaison IRC année à année (2024, 2025, 2026)** — une trace phytographique n'apparaît pas tous les ans (bon stade de croissance, déficit hydrique). Trois millésimes multiplient les chances de détection.

**Identifiants WMTS** :
- `ORTHOIMAGERY.ORTHOPHOTOS.IRC-EXPRESS.2024`
- `ORTHOIMAGERY.ORTHOPHOTOS.IRC-EXPRESS.2025`
- `ORTHOIMAGERY.ORTHOPHOTOS.IRC-EXPRESS.2026`

**Détail technique** :
- Format : image/jpeg (fausses couleurs IRC)
- TileMatrixSet : `PM`
- Zoom : z0–19

**Statut** : [FAIT]

**Attribution** : Etalab 2.0 / © IGN

**Accès** : data.geopf.fr

**Usage** : T1.1 doit pouvoir enchaîner IRC 2024 → 2025 → 2026 sur la même vue (rideau de comparaison, opacité variable). Trace qui apparaît une seule année au bon endroit = signal fort.

---

#### 2.5 Orthophoto RVB Express (2025, 2026) et Ortho Express (2024)

**Contenu** : Variantes saisonnières, avant remembrement (Express 2024).

**Identifiants WMTS** :
- `ORTHOIMAGERY.ORTHOPHOTOS.RVB-EXPRESS.2025`
- `ORTHOIMAGERY.ORTHOPHOTOS.RVB-EXPRESS.2026`
- `ORTHOIMAGERY.ORTHOPHOTOS.ORTHO-EXPRESS.2024`

**Statut** : [FAIT]

**Attribution** : Etalab 2.0 / © IGN

**Accès** : data.geopf.fr

---

### 3. Orthophotos historiques 1950–1965

#### 3.1 Ortho 1950–1965 — DISPONIBLE EN WMTS

**Contenu** : **Avant remembrement, talus, chemins creux, parcellaire ancien — critique pour localiser les deux noyaux villageois (Armous + Cau).**

**Statut** : **[FAIT — GetTile réel réussi sur la zone, 2026-08-08]** — la couche est absente de l'annexe `ortho.xml` mais **présente dans le GetCapabilities global** :

- Identifiant : **`ORTHOIMAGERY.ORTHOPHOTOS.1950-1965`** · TMS `PM` · style `normal` · format **`image/png`** (le `image/jpeg` renvoie 400)
- Preuve (tuile réelle sur Armous-et-Cau, z14 col 8200 row 5984) :
```
curl -4 -s 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS.1950-1965&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX=14&TILEROW=5984&TILECOL=8200'
→ 200 image/png
```
- Leçon de méthode : les annexes thématiques (`ortho.xml`) ne listent pas tout — tester le **GetCapabilities global** avant de conclure à une absence.
- [À VÉRIFIER] : bornes de zoom exactes de la couche (à lire dans le GetCapabilities global, prévoir `maxNativeZoom` comme pour Cassini).

**Conséquence** : la vue avant remembrement se consomme **en flux direct dans l'app (T1.1)** — l'export manuel remonterletemps redevient un simple plan B.

#### 3.2 Procédure de récupération (plan B, si le flux se révélait incomplet sur la zone)

**Source** : https://remonterletemps.ign.fr/

**Procédure** (manuelle, non-automatisée) :
1. Naviguer sur remonterletemps.ign.fr
2. Positionner la carte sur Armous-et-Cau (INSEE 32009)
3. Afficher la couche « Photographies aériennes 1950–1965 » (ou équivalent disponible)
4. Télécharger la tuile au format GeoTIFF ou PNG (export PNG à géoréférencer manuellement, ou utiliser QGIS pour requête WMS/WFS si disponible)
5. Reprojeter en EPSG:3857 si nécessaire (§5.6 du PLAN.md)
6. Intégrer en PMTiles pour l'app (ou servir comme overlay staticRaster externe)

**Gotcha** : Vérifier si remonterletemps.ign.fr expose un endpoint WMS/WFS. Si oui (probable), il peut être intégré directement ; sinon, export PNG manuel par zone.

**Statut de cette source** : [À VÉRIFIER] — La disponibilité effective pour Armous-et-Cau et la procédure précise d'export doivent être confirmées sur machine locale (IPv4, navigateur humain).

**Attribution** : Etalab 2.0 / © IGN

---

### 4. LiDAR HD (§4.2 du PLAN.md)

#### 4.1 Présentation

**Contenu** : **Modèle numérique de terrain (MNT) à 0,5 m de résolution, dalles 1 km×1 km, format COPC.LAZ** (cloud-optimized Point Cloud).

**Cas d'usage** :
- Micro-topographie de motte castrale, enceinte, levée de chemin
- Anomalies subtiles (effondrements, lits fossiles)
- Algorithmes de détection automatisée d'anomalies (publications [HAL](https://hal.science/hal-05042607))

**Couverture nationale** : ~80% fin 2025 (Programme LiDAR HD, IGN)

**Statut d'Armous-et-Cau** : [À VÉRIFIER] — **Commune en bleu sur la carte de suivi IGN = « nuages et modèles numériques disponibles »** (levé 2026-08-08)

**Vérification à mener** : Consulter
- https://geoservices.ign.fr/lidarhd (carte interactive)
- https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD (fiche commune)

pour confirmer le **libellé exact du statut** et la **procédure de téléchargement des dalles 1 km×1 km**.

#### 4.2 Dalles concernant Armous-et-Cau

**Emprise nominale** : 43.55–43.60°N / 0.15–0.23°E (environ, à affiner)

**Système de projection des dalles** : **Lambert-93 (EPSG:2154)** (standard français pour LiDAR, pas Web Mercator)

**Identifiants de dalles** : **À lister manuellement depuis la plateforme IGN** (format type : `1km_D123_E456.laz`, dépend du découpage 1 km×1 km en L93)

**Procédure** : **[MACHINE LOCALE]**
1. Accéder à https://geoservices.ign.fr/lidarhd ou plateforme de diffusion associée
2. Sélectionner la commune Armous-et-Cau (INSEE 32009)
3. Télécharger les dalles COPC.LAZ couvrant la bbox commune
4. Reprojeter MNT / nuages en EPSG:3857 (Web Mercator) pour intégration app, **ou** garder en L93 pour traitement `tools/prep/` et export PMTiles dérivées (hillshade, SVF, LRM)

**Statut source** : [À VÉRIFIER]

**Statut données** : [MACHINE LOCALE] — Proxy Claude Code bloque geoservices.ign.fr

**Attribution** : Etalab 2.0 / © IGN – Programme LiDAR HD

#### 4.3 Plan B (si LiDAR HD absent)

Si la commune n'est pas couverte (peu probable mais possible fin 2026) : repli sur **RGE ALTI 1 m** (résolution dégradée, détection réduite d'anomalies subtiles).

À documenter dans le README si appliqué.

---

### 5. Cadastre moderne (§4.1)

#### 5.1 Cadastre Express (WMTS)

**Contenu** : Délimitations de parcelles actuelles, repérage terrain.

**Identifiant WMTS** : `CADASTRALPARCELS.PARCELLAIRE_EXPRESS`

**Détail technique** :
- Format : vecteur (GeoJSON ou MVT selon configuration)
- TileMatrixSet : `PM`
- Zoom : z0–20
- Attributs : références cadastrales (département-commune-section-numéro)

**Statut** : [FAIT]

**Attribution** : Etalab 2.0 / © Cadastre

**Accès** : data.geopf.fr

---

#### 5.2 RPG (Registre parcellaire graphique)

**Contenu** : Cultures déclarées — distinguer labour (mobilier remonté, sol pénétrable) de prairie permanente (couvert résistant).

**Format** : Open data (flux JSON/GeoJSON ou téléchargement annuel)

**Accès** : https://api.gouv.fr/api/rpg ; filtrer par commune INSEE 32009

**Statut** : [HYPOTHÈSE] — Source existe (données publiques MAAF) ; utilité confirmée (agriculture) ; accès exact et structure de données à vérifier pour Armous-et-Cau

**Attribution** : MAAF / Open data

**Gotcha** : Millésimes varient par année ; s'assurer d'utiliser le millésime correspondant au vol ortho multi-millésime (ex. RPG 2024 ↔ Ortho Express 2024)

---

### 6. Archives et cadastre historique (§4.3)

#### 6.1 Cadastre napoléonien (AD32 — Archives départementales du Gers)

**Contenu** :
- Plans numérisés 1/2500 (sections « d'Armous », « de Barroles », « de Rozes », « de Mauran »)
- États de sections (noms de propriétaires, superficies, métier, moyen de culture)
- Matrices (analyse des variations foncières 1813–1860)
- Tableau d'assemblage 1/10000

**Statut** : [FAIT] — Vérifiée 2026-08-08 (memory/DECISIONS.md)

**Détail** :
- 9 planches numérisées pour Armous-et-Cau
- Cote : **3P**
- Sections : C1/C2 (« dite d'Armous »), A (« de Barroles »), B (« de Rozes »), D (« de Mauran »)
- Dates : 1813–1819 (géomètres Daubas et autres)

**Acces** : https://archives32.fr → Fonds numérisés → « Recherche de plans cadastraux napoléoniens »

**Consultation** : Visionneuse zoomable sur site (zoom_n.php) ; export pleine résolution à confirmer lors du calage (lot T3.1)

**Importance critique** : Plans **non géoréférencés** (§4.4 du PLAN.md) → calage manuel nécessaire (amers : angles d'église, croisements de chemins, limites parcellaires pérennes). Travail long, c'est le prix d'entrée du meilleur prédicteur du projet.

**Attribution** : Domaine public / © Archives départementales du Gers

**Gotcha** : Aucune section « de Cau » identifiée → noyau de Cau en limite de commune ou dans une section existante. À confirmer (T2.3 ou T2.4).

---

#### 6.2 Fichiers Henri Polge (AD32)

**Contenu** :
- **Dictionnaire topographique du Gers** (microtoponymes anciens, patronymes, **domaines gallo-romains -an/-ac**)
- **Dictionnaire archéologique du Gers** (sites connus, découvertes anciennes)
- **Répertoire des patronages anciens et modernes des églises et chapelles** (vocables de saints, localisations)

**Auteur/Contexte** : Polge, directeur AD32 de 1948–1978, spécialiste onomastique gallo-romaine

**Accès** :
- Salle de lecture AD32 (Auch) — originaux
- Persée (onomastique) : [*Appellations de domaines antiques dans le département du Gers*](https://www.persee.fr/doc/rio_0048-8151_1965_num_17_1_1876) (article 1965)

**Statut** : [FAIT] — existants, vérifiables ; recherche en salle de lecture à mener

**Attribution** : Domaine public / © Polge

**Usage** : **Essentiel pour décodage toponymie gasconne** (§2.5 du PLAN.md). `-an` / `-ac` = domaine gallo-romain (*fundus*) ; `castèra`, `mothe`, `glèisa`, etc. = marqueurs d'occupation.

---

### 7. Patrimoine et archéologie (§4.3)

#### 7.1 Atlas des patrimoines (Patriarche)

**Contenu** : Entités archéologiques, opérations de fouille, ZPPA (zones de présomption de prescriptions archéologiques), monuments historiques, périmètres.

**URL** : https://atlas.patrimoines.culture.fr/

**Protocoles** : WMS/WFS (à confirmer) + interface web interactive

**Statut** : [À VÉRIFIER] — **Test réseau en cours**

**Vérification faite** :
```
curl -4 -s https://atlas.patrimoines.culture.fr/geoserver/ows -I
```
Résultat : Pas de réponse / timeout. À retester sur machine locale (IPv4, firewall).

**Procédure à valider** :
1. Tester endpoint WMS : `https://atlas.patrimoines.culture.fr/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities`
2. Tester endpoint WFS : `https://atlas.patrimoines.culture.fr/geoserver/ows?service=WFS&version=2.0.0&request=GetCapabilities`
3. Si disponible : intégrer en overlay WMS/WFS (T1.2) ; sinon : export manuel (interface web) et vectorisation (T3.1)

**Cas usage** : Drapeau ZPPA et MH sur cellules de scoring (§7 du PLAN.md) — à traiter avant creusage.

**Gotcha** : À vérifier si les entités **archéologiques** de la commune (vrais sites, pas juste bâti protégé) sont présentes et précises.

**Attribution** : Public / © Ministère de la Culture

---

#### 7.2 Gallica / BnF — Cassini et autres fonds

**Contenu** :
- Feuille Cassini haute résolution (400 dpi, exemplaire BnF)
- Cartes antérieures au XVIII<sup>e</sup> s. (rares pour Gers)
- Autres documents géographiques et historiques

**URL** : https://gallica.bnf.fr/ → [Sélection Carte de Cassini](https://gallica.bnf.fr/selections/fr/html/carte-de-cassini)

**Statut** : [À VÉRIFIER] — Web publique et gratuite, mais **IPv6 timeout** (proxy local bloque)

**Accès** : Machine locale (Mac, navigateur) → Gallica fonctionne nativement

**Utilité** : Référence visuelle haute définition (confirmation nomenclature IGN, évaluation détails levés). Les tuiles WMTS Cassini sont dérivées de l'exemplaire BnF.

**Attribution** : Domaine public / © BnF

---

#### 7.3 CAG 32 (Carte archéologique de la Gaule, *Le Gers*)

**Titre complet** : *Carte archéologique de la Gaule — Le Gers (32)*, Lapart & Petit, AIBL 1993, ISBN 978-2-87754-019-3, 354 p.

**Contenu** : **Inventaire exhaustif des découvertes archéologiques depuis l'âge du Fer au haut Moyen Âge, commune par commune, site par site**. Référence pour Armous-et-Cau.

**Accès** :
- AIBL (Académie des Inscriptions et Belles-Lettres) — [catalogue en ligne](https://aibl.fr/collections/carte-archeologique-de-la-gaule-32-le-gers/)
- FRANTIQ (Fédération des recherches archéologiques) — [catalogue](https://catalogue.frantiq.fr/cgi-bin/koha/opac-detail.pl?biblionumber=690365)
- Gallica (partiellement) — https://gallica.bnf.fr/selections/fr/html/carte-archeologique-de-la-gaule ; **[À VÉRIFIER] si vol. 32 est numérisé**

**Statut** : [À VÉRIFIER] — Ouvrage imprimé certain (date, auteurs, cote) ; numérisation sur Gallica à confirmer

**Priorité** : **Très haute** — Source primaire pour localiser sites gallo-romains et médiévaux du secteur

**Attribution** : Domaine public (ouvrage 1993, AIBL)

---

#### 7.4 Bulletin de la Société archéologique du Gers

**Contenu** : Trimestriel depuis 1900 (fondée 1891 à Auch). Un siècle de signalements locaux : découvertes monétaires, fragments, fouilles de crise.

**Couverture** : 65 années numérisées en ligne (1900–1965 environ)

**Accès** :
- Gallica : https://gallica.bnf.fr/ark:/12148/cb34426497s/date (accès en ligne, gratuit)
- Internet Archive : https://archive.org/details/bulletindelasoc04gersgoog (backup)
- Archives imprimées de la société : déposées aux AD32, musée d'Auch

**Statut** : [FAIT] — Accès confirmé en ligne

**Recherche** : Filtrer par année / numéro couvrant Armous-et-Cau ou communes proches (Beaumarchés, Marciac, Bassoues)

**Attribution** : Domaine public (publications anciennes) / Gallica

---

#### 7.5 Monographie — Abbaye de La Case-Dieu

**Titre** : Article/mémoire sur l'abbaye de La Case-Dieu et son réseau foncier (XII<sup>e</sup>–XVI<sup>e</sup> s.)

**Source** : Mémoires de la Société archéologique du Midi, t. 64, auteur Balagna (ou variante)

**Accès** : https://societearcheologiquedumidi.fr/_samf/memoires/t_64/balagna.pdf (PDF direct, gratuit)

**Contenu utile** : Réseau de granges monastiques, moulins, bastides fondées sur propriété abbatiale (notamment **Marciac 1298** sur grange du Houga). Contexte pour hypothèse grange/moulin Armous-et-Cau.

**Statut** : [FAIT] — Vérifié présent sur site

**Attribution** : Public / © Société archéologique du Midi

---

### 8. Géologie et pédologie

#### 8.1 BRGM InfoTerre

**Contenu** : Géologie du Gers (molasse tertaire, terrasses alluviales, substrat limono-argileux). Utile pour :
- Corrélation implantation antique / substrat (plutôt pente, plutôt terrasse)
- **Calibrage des presets de sensibilité du détecteur** (§9.8 du PLAN.md) : minéralisation et conductivité du sol imposent des seuils

**Accès** : https://infoterre.brgm.fr/ → requête par commune ou coord

**Statut** : [HYPOTHÈSE] — Service BRGM existant et public ; couverture Gers à confirmer (probablement oui)

**Attribution** : Open data / © BRGM

**Utile pour** : Lot T3.2 (calibrage presets)

---

### 9. Données climatiques et météorologiques

#### 9.1 Open-Meteo (ERA5-Land)

**Contenu** : Historique de précipitations, humidité du sol, température depuis 1940, grille 0,1° (~11 km).

**Format** : API REST, réponse JSON

**URL** : https://open-meteo.com/en/docs/historical-weather-api

**Caractéristiques** :
- Pas de clé d'API (gratuit)
- 10 000 appels/jour (suffisant)
- Données ERA5-Land (réanalyse Copernicus/ECMWF)

**Statut** : [FAIT] — Service public, documenté

**Usage** : Alimente la **fenêtre de sortie recommandée** (§9.3 du PLAN.md) — « labours frais après pluie » réalisable si précipitations = données. Optimise timing prospection.

**Attribution** : ERA5/Copernicus (CC BY 4.0)

---

### 10. Toponymie et ressources linguistiques

#### 10.1 DicoTopo (CTHS)

**Contenu** : Version numérique des dictionnaires topographiques départementaux (Gers inclus).

**Format** : Recherche web / base de données

**URL** : https://dicotopo.cths.fr/

**Statut** : [HYPOTHÈSE] — Service CTHS existant (Comité des Travaux Historiques et Scientifiques) ; couverture Gers probable

**Usage** : Complément aux fichiers Polge (autre source), vérification orthographe et sens micro-toponyme.

**Attribution** : Public / © CTHS

---

### 11. Sources humaines (§4.4 du PLAN.md)

#### 11.1 Exploitant agricole

**Rôle** : Connaissance empirique du terrain — « ça fait des cailloux », concentration de tuile, labours anciens, parcelles jamais cultivées récemment.

**Accessibilité** : À identifier via mairie locale ou reconnaissance visite. Seul contact pertinent pour accès au champ.

**Rendement estimé** : [HYPOTHÈSE] — Un après-midi de discussion = plusieurs semaines de dépouillement archives (selon PLAN.md §4.4 ; à tester).

**Attribution** : Entretien privé

---

#### 11.2 Société archéologique, historique, littéraire et scientifique du Gers

**Rôle** : Mémoire locale, découvertes anciennes non publiées, connexions académiques.

**Localisation** : Auch (siège)

**Accès** : Visite, adhésion (probablement modique), correspondance

**Gotcha** : Milieu académique généralement **hostile à la détection de loisir**. Approche : « intérêt historique de la commune » plutôt que « mon détecteur ».

**Site** : https://www.societearcheologiquehistoriquelitteraireetscientifique.com/

**Attribution** : Entretien / Adhésion

---

#### 11.3 Mairie et anciens d'Armous-et-Cau

**Rôle** : Localisation ancienne églises, souvenirs de fondations en creusant, micro-toponymie locale toujours vivante, historique parcellaire.

**Caractéristique de la zone** : 95 habitants → tout le monde se connaît ; archives locales souvent détenues par habitants (vieilles photos, vieilles cartes).

**Accès** : Visite mairie, café local

**Attribution** : Entretien / Récit

---

## Verdict des 3 bloquants (§8 du PLAN.md)

### 1. Atlas des patrimoines — WMS/WFS exploitable ?

**Test mené** : Requête `curl -4 https://atlas.patrimoines.culture.fr/geoserver/ows -I`

**Résultat** : Pas de réponse HTTP (timeout ou bloqu réseau sur machine Docker)

**Statut** : [À VÉRIFIER — testé aussi depuis la machine locale le 2026-08-08, sans succès] :

```
curl -4 'https://atlas.patrimoines.culture.fr/geoserver/ows?service=WMS&...&request=GetCapabilities'
→ échec TLS (curl exit 35), aucun GetCapabilities servi
curl -4 'http://atlas.patrimoines.culture.fr/atlas/rest/services' → 404
```

Aucun endpoint WMS/WFS public confirmé à ces URLs. Reste à tester **dans un navigateur** : l'interface web de l'Atlas (atlas.patrimoines.culture.fr) et l'inspection réseau de ses appels de couches (l'appli cartographique interne appelle forcément un service — à identifier via l'onglet réseau). Si rien d'exploitable → plan B ci-dessous, considéré comme la voie par défaut.

**Plan B (voie par défaut)** : Export manuel via interface web (atlas.patrimoines.culture.fr), vectorisation des entités archéologiques d'Armous-et-Cau en GeoJSON versionné dans `data/derived/`, intégration en overlay (lot T3.4, données préparées en T3.1).

---

### 2. LiDAR HD Gers — Disponible et procédure de téléchargement ?

**Blocant initial** : Couverture LiDAR HD d'Armous-et-Cau

**Test / Vérification** : Consulter carte de suivi (memory/DECISIONS.md, 2026-08-08) → commune en **bleu** (« nuages et modèles numérique disponibles »)

**Statut** : [À VÉRIFIER] — Levé comme « bleu » en 2026-08-08, mais procédure exacte de téléchargement des dalles et identifiants restent à confirmer

**Procédure à mener (machine locale, [MACHINE LOCALE])** :
1. Accéder https://geoservices.ign.fr/lidarhd (carte interactive)
2. Consulter https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD (fiche de diffusion commune)
3. Confirmer libellé exact du statut
4. Lister les identifiants de dalles 1 km×1 km couvrant bbox Armous-et-Cau (43.55–60°N / 0.15–23°E approx.)
5. Télécharger dalles COPC.LAZ (format standard) avec hash de vérification
6. Tester décompression et format (tool `pdal`)

**Résultat attendu** : Liste des dalles (ex. `D1234_E5678.laz`) + URL de téléchargement + format confirmé COPC.LAZ

**Plan B si absent** : Repli sur RGE ALTI 1 m, documenté dans README avec limitation (détection réduite anomalies subtiles)

---

### 3. Orthophotos 1950–65 — Accessibles en WMTS ?

**Test mené** : Téléchargement et parsing `ortho.xml` (data.geopf.fr/annexes/ressources/wmts/ortho.xml)

**Résultat** :
```
✓ HTTP 200, fichier complet téléchargé
✓ 66 couches WMTS extraites
✗ Zéro couche datée 1950–1965, zéro « historique »
✗ Aucune mention d'orthophotos XIXe ou très anciennes
```

**Couches trouvées** :
- Standards (ORTHOIMAGERY.ORTHOPHOTOS, THR, IRC, IRC-EXPRESS 2024–2026, ORTHO-EXPRESS 2024, RVB-EXPRESS 2025–2026)
- **Aucune antérieure à 2023**

**Statut final : [FAIT] — DISPONIBLES en WMTS.** Le test initial concluait à tort à l'absence : il ne regardait que l'annexe `ortho.xml` et testait une tuile aux coordonnées erronées (row 6062 au lieu de 5984). Test corrigé du 2026-08-08 sur machine locale :

```
curl -4 -s 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities' \
  | grep -o '<ows:Identifier>[^<]*1950[^<]*</ows:Identifier>'
→ ORTHOIMAGERY.ORTHOPHOTOS.1950-1965 (+ SCAN50.1950)

GetTile LAYER=ORTHOIMAGERY.ORTHOPHOTOS.1950-1965, PM, image/png, z14/row5984/col8200
→ 200 image/png (image/jpeg → 400)
```

Voir §3.1 ci-dessus. **Plan B (non nécessaire sauf trou de couverture)** : https://remonterletemps.ign.fr (interface web interactive)

**Procédure d'export (manuel)** :
1. Naviguer https://remonterletemps.ign.fr/
2. Positionner sur Armous-et-Cau (INSEE 32009)
3. Chercher couche « Photographies aériennes 1950–1965 » (ou vol. disponible de cette période)
4. Si trouvé : télécharger en PNG ou GeoTIFF (vérifier géoréférencement)
5. Reprojeter EPSG:3857 si nécessaire (§5.6 du PLAN.md)
6. Intégrer en PMTiles (tools/prep/) ou overlay externe en T1.2

**Gotcha** : Vérifier si remonterletemps expose un endpoint WMS/WFS (probable). Si oui, peut être intégré directement en flux ; sinon export manuel par zone.

**Validation finale** : À tester effectivement sur remonterletemps (access machine locale, IPv4) — ne pas supposer que la couche 1950-65 existe pour Armous-et-Cau (petite commune ruraleayant pu ne pas être couverte à cette époque)

---

## Résumé — État avant T3.1 (pipeline de données)

| Catégorie | Verdict | Bloquant T3.1 ? |
|-----------|---------|---|
| **Cartes WMTS IGN** (Cassini, État-major, Ortho, IRC multi-millésime) | [FAIT] — 8 couches confirmées, flux testé | Non — utilisable immédiatement |
| **LiDAR HD Gers** | [À VÉRIFIER] — commune probablement en bleu, procédure à confirmer | Oui (moyen) — gérer plan B RGE ALTI 1m en parallèle |
| **Atlas des patrimoines (WMS/WFS)** | [À VÉRIFIER] — testé en local 2026-08-08 : échec TLS + 404, aucun service OGC public trouvé ; reste l'inspection réseau via navigateur | Oui (moyen) — plan B export manuel = voie par défaut |
| **Ortho 1950-65 (WMTS)** | [CONFIRMÉ ABSENT] — recours unique remonterletemps.ign.fr | Oui (moyen) — prévoir export manuel + reprojection |
| **Cadastre napoléonien (AD32)** | [FAIT] — 9 planches en ligne, visualisation OK | Non — calage manuel long mais pas bloquant |
| **Archives historiques (Polge, Bulletin Soc. archéo., CAG 32)** | [FAIT] pour certaines (Bulletin Gallica confirmé), [À VÉRIFIER] pour CAG vol. 32 | Non — enrichissement, pas bloquant |
| **RPG, BRGM, Open-Meteo** | [HYPOTHÈSE] — sources existantes, accès à confirmer pour Armous-et-Cau | Non — enrichissement scoring |
| **Sources humaines (exploitant, mairie, société archéo.)** | [HYPOTHÈSE] — à initier par Oscar | Non — complémentaire |

---

## Intégrations recommandées par lot

### T3.1 (Pipeline de données)

**Sources prioritaires** :
1. Télécharger WMTS IGN (Cassini, État-major, Ortho multi-millésime, IRC) → PMTiles
2. Confirmer + télécharger LiDAR HD Gers (dalles COPC.LAZ) → hillshade/SVF/LRM génération
3. Géoréférencer cadastre napoléonien AD32 → GeoJSON
4. **Si disponible** : WMS/WFS Atlas patrimoines → overlay ; sinon export manuel + vectorisation
5. **Si disponible** : Ortho 1950-65 remonterletemps → GeoTIFF + reprojection

**Dépendances externes** :
- GDAL / GDAL Python (calage cadastre, reprojection, hillshade)
- `pdal` (validation COPC.LAZ)
- `protomaps-cli` ou `tippecanoe` (génération PMTiles)
- `ogr2ogr` (conversions vecteur)

---

### T3.4 (Zones signalées)

**Sources pour scoring** :
1. Cadastre napoléonien géoréférencé (drapeau mottes, enclos, vocables saints)
2. Toponymie (Polge + DicoTopo + cadastre napoléonien) → identification `-an/-ac`, `castèra`, `glèisa`, etc.
3. LiDAR SVF/LRM (anomalies micro-topographiques)
4. IRC multi-millésime (crop marks saisonniers)
5. Atlas patrimoines (ZPPA, MH) → drapeau avant creusage
6. Bulletin Soc. archéo. + CAG 32 (sites existants)
7. Cassini + État-major (bâti disparu, ancien parcellaire)

---

## Procédures d'accès (synthèse)

### IGN / data.geopf.fr (WMTS direct)

```bash
# GetCapabilities exemple
curl -4 https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities

# GetTile exemple (Cassini)
curl -4 "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=12&TILEROW=2045&TILECOL=2048&FORMAT=image/png"
```

**Accès** : Public, pas d'authentification
**Gotcha** : Proxy Docker bloque → [MACHINE LOCALE]

### Archives 32 (AD32)

```
https://archives32.fr → Fonds numérisés → Plans cadastraux napoléoniens
Accès : Zoomable en visionneuse web + export PDF/TIF à la demande
```

### Gallica / BnF

```
https://gallica.bnf.fr/ → rechercher « Cassini Gers » ou « Carte archéologique »
Accès : Gratuit ; IPv6 timeout sur Docker → [MACHINE LOCALE]
```

### remonterletemps.ign.fr

```
https://remonterletemps.ign.fr/ → Interface web interactive
Accès : Gratuit ; export manuel (PNG/GeoTIFF)
Procédure WMS : à vérifier (probablement disponible)
```

### Open-Meteo

```
https://open-meteo.com/en/docs/historical-weather-api
Exemple : https://archive-api.open-meteo.com/v1/archive?latitude=43.5742&longitude=0.1908&start_date=1940-01-01&end_date=2026-08-08&daily=precipitation,soil_moisture_0_to_10cm
Accès : Gratuit, REST, 10k appels/jour
```

### geoservices.ign.fr / lidarhd (LiDAR HD)

```
https://geoservices.ign.fr/lidarhd → Carte interactive
https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD → Fiche commune
Accès : Public ; géoservices.ign.fr bloqué par proxy Docker → [MACHINE LOCALE]
Procédure : Consulter carte, lister dalles, télécharger COPC.LAZ
```

---

## Notes pour l'orchestrateur

- **Trois bloquants de portée moyenne** → À lever avant T3.1 en mode complet
- **Machine locale requise** : 4 points (Cassini Gallica, LiDAR HD, remonterletemps, Atlas patrimoines)
- **Pas de secrétaire / clé requise** — tout est public
- **Proxy Docker** : À garder en tête pour tests distants
- Résultats bloquants à remonter dans **memory/DECISIONS.md** dès vérification complète

---

**Rédigé par** : T2.2 (Agent) | **Date** : 2026-08-08 | **Verrous levés** : 3/3 en attente de test local

