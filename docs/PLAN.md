# Plan — `treasure-detector` : web app de prospection au détecteur de métaux
**Zone pilote : Armous-et-Cau (Gers, 32230)** · rédigé le 2026-08-08 · destiné à exécution par agents **sonnet**

---

## 0. Conventions de lecture (contraignantes pour tout agent)

Ce document est le **contrat d'exécution**. Trois marqueurs, utilisés partout :

| Marqueur | Sens | Ce que l'agent doit en faire |
|---|---|---|
| **[FAIT]** | Fait sourcé, source citée dans le texte | Utilisable tel quel |
| **[À VÉRIFIER]** | Plausible mais non confirmé cette session | **Vérifier avant de bâtir dessus**, corriger le doc si faux |
| **[HYPOTHÈSE]** | Déduction de raisonnement, aucune source | **Ne pas transformer en contrainte.** Tester, ou demander à Oscar |

Règle absolue héritée du CLAUDE.md racine : ne jamais annoncer « fait / vert / déployé » sans preuve produite dans le même tour — sortie brute de test, capture de preview, deploy `SUCCESS`. Pas de preuve possible → écrire « fait, non vérifié ».

**Contrainte d'environnement connue** : le proxy d'egress des conteneurs Claude Code **bloque `data.geopf.fr` et `geoservices.ign.fr`** (curl → `403 CONNECT tunnel failed`, vérifié 2026-08-08). Aucun agent en conteneur ne peut tester les tuiles IGN ni télécharger une dalle LiDAR. Ces tâches sont marquées **`[MACHINE LOCALE]`** : à exécuter sur le poste d'Oscar ou à valider sur la preview Railway déployée.

---

## 1. Décisions prises par Oscar (non rediscutables)

| Sujet | Décision |
|---|---|
| Nom | **`treasure-detector`** |
| Visibilité | **Repo public**, objectif de prospection assumé |
| Zone pilote | **Armous-et-Cau (32)** et son environnement immédiat |
| Prédiction | **Scoring heuristique transparent**, pondérations éditables, explicable cellule par cellule |
| Autorisations / cadre réglementaire | **Hors périmètre du projet.** Aucun agent ne produit de dossier d'autorisation, de modèle d'accord de propriétaire, ni de garde-fou bloquant au nom de la conformité. Oscar gère où il va. |
| Ordre des travaux | Laissé à mon jugement → **outil de terrain d'abord**, dossier historique en parallèle (§8) |
| Stack | **PWA local-first, Railway pour l'hébergement + Supabase pour données et photos** (§5.1, révisé 2026-08-08) |
| Déploiement | **Railway** (statique) + **Supabase** (données, photos). Les deux CLI sont installés chez Oscar. |
| Forme de l'app | **Web app**, confirmé. Pas d'emballage natif, ni en v1 ni en v2. |
| Usage terrain | **Téléphone en main**, carte ouverte → le tracé GPS en avant-plan suffit (§5.4) |
| Détecteur | **Garrett ACE 250** — 6,5 kHz, disque 6,5"×9", échelle à 12 segments, sans ground balance. Contraint le contrat de données (§6) et le protocole (§9.7). |
| Pondérations du scoring | **Déléguées à moi** par Oscar. J'en suis responsable, elles restent en JSON éditable, et je les révise après les premières sorties au vu des `DigPoint` réels. |

Une seule chose que je garde par défaut, purement technique : les coordonnées de trouvailles dans `data/private/`, gitignoré. Raison : un repo public qui liste des points de trouvailles précis se fait ratisser par des tiers avant toi. Le code et la méthode sont publics, les cibles non. Un `.gitignore` à modifier si tu veux l'inverse.

---

## 2. Le savoir spécialiste : la zone

### 2.1 Fiche d'identité

- Armous-et-Cau, **43.5742 N / 0.1908 E** [À VÉRIFIER — source annuaire, à recaler sur l'IGN], **9,33 km²**, altitude moyenne ~250 m, **95 habitants** ([commune-mairie.fr](https://commune-mairie.fr/armous-et-cau-32230), [map-france](https://www.map-france.com/Armous-et-Cau-32230/))
- Code INSEE **32009** ([Geneawiki](https://fr.geneawiki.com/wiki/32009_-_Armous-et-Cau))
- CC **Cœur d'Astarac en Gascogne** ; historiquement comté d'**Astarac**, à la frange de l'**Armagnac** ([coeur-dastarac.fr](http://www.coeur-dastarac.fr/fr/territoire/1597/))
- Beaumarchés à **5,8 km** ; Marciac, Bassoues, Montesquiou, Aignan dans le rayon proche
- **Hydrographie — correction d'une erreur de ma première version.** J'avais écrit que la mention « Midouze » des annuaires était « très probablement fausse » et rattaché la commune au bassin du Bouès/Arros. **C'était faux, et c'était une déduction énoncée comme un fait.** La vérité : **le Midour prend sa source à Armous-et-Cau** ([SIA Midour-Douze](http://www.sia-rivieresarmagnac.fr/siamd/territoire_md.htm), [Larousse](https://www.larousse.fr/encyclopedie/riviere-lac/la_Midouze/178806)) ; long de 97 km, il rejoint la Douze à Mont-de-Marsan pour former la **Midouze**, affluent de l'Adour. L'annuaire était approximatif, pas erroné. Confirmé visuellement : « le Midour » traverse la commune sur la carte IGN. Ruisseaux affluents : **Guillembounet**, **Mauran**.

  **Et ce n'est pas un détail de géographie.** Une **source de rivière** est un marqueur d'implantation de premier ordre : foyer naturel d'habitat, et lieu fréquemment sanctifié à l'époque gallo-romaine (sanctuaires de source). Le microtoponyme **Hountan** (`hont` = fontaine/source en gascon) relevé sur la carte le confirme au sol. **La zone de source du Midour entre au rang A du scoring** (§7).

### 2.2 Ce qui fait de cette commune une cible sérieuse — l'atout majeur

**Armous et Cau étaient deux villages distincts, fusionnés seulement entre 1790 et 1794.** L'église d'Armous, rattachée au XI<sup>e</sup> siècle à l'abbaye bénédictine de **Saint-Mont**, **n'existe plus**. L'église actuelle (Saint-Martin, XIX<sup>e</sup>) **a été construite avec les pierres des deux anciennes églises d'Armous et de Cau** ([coeur-dastarac.fr](http://www.coeur-dastarac.fr/fr/territoire/1597/), [tourisme-mirande-astarac](https://www.tourisme-mirande-astarac.com/en/discover-astarac/communes/armous-et-cau/)).

Ce que ça implique concrètement : **deux noyaux villageois médiévaux abandonnés, avec leurs deux sites d'église, dans une commune de 9 km²**. Un habitat déserté labouré depuis deux siècles est le type de site qui livre le plus de mobilier métallique dans la couche de labour — monnaies de billon, boucles, appliques, jetons de compte, dés à coudre, plombs de scellés, ferrures. Et le transport de la pierre au XIX<sup>e</sup> siècle signifie que **les élévations ont été arasées mais le sol, lui, n'a jamais été fouillé**.

C'est la cible n°1. Localiser précisément ces deux noyaux est le livrable historique le plus important du projet.

### 2.3 Trame historique (à approfondir par T2.1)

| Période | Ce qu'on sait | Implication prospection |
|---|---|---|
| **Antiquité** | Le Gers est l'un des départements les plus denses en **villae gallo-romaines**. Elusa (Éauze) fut capitale de la **Novempopulanie** au III<sup>e</sup> s. ; villa de Séviac (Montréal-du-Gers) comme référence d'un domaine du IV<sup>e</sup> s. ([mairie-eauze.fr](https://www.mairie-eauze.fr/ElusaCapitaleAntique), [tourisme-gers](https://www.tourisme-gers.com/le-gers-gallo-romain-montreal-du-gers-60640)) | Chercher les **marqueurs de sol** en orthophoto : taches claires de tuile et de calcaire broyés par la charrue, sur rebord de plateau ou mi-pente exposée S/SE, près d'une source. Monnaies de bronze du Bas-Empire, fibules. |
| **XI<sup>e</sup> s.** | Église d'Armous rattachée à l'**abbaye de Saint-Mont** | Site d'église disparue = cible A |
| **XII<sup>e</sup> s.** | Armous et Cau aux **seigneurs de Saint-Christaud**, puis à l'**abbaye de La Case-Dieu** ([coeur-dastarac.fr](http://www.coeur-dastarac.fr/fr/territoire/1597/)) | Voir ligne suivante |
| **XII<sup>e</sup>–XIV<sup>e</sup> s.** | **La Case-Dieu** (prémontrés, Beaumarchés, fondée ~1135 par Bernard de Troncens) : puissance foncière régionale, réseau de **granges monastiques**, **moulins** (Houga, Espalanque, Plaisance), fondation de bastides sur ses propres granges — Mourède 1286, **Marciac 1298** sur les granges du Houga et d'Andenac, Plaisance 1322 ([Wikipédia](https://fr.wikipedia.org/wiki/Abbaye_de_la_Case-Dieu), [Société archéologique du Midi, t.64](https://societearcheologiquedumidi.fr/_samf/memoires/t_64/balagna.pdf)) | **[HYPOTHÈSE à tester, pas une conclusion]** : si l'abbaye possédait Armous et Cau, elle y exploitait vraisemblablement une grange et/ou un moulin. À confronter au **cartulaire de La Case-Dieu** et aux fonds AD32. C'est une piste. |
| **XIV<sup>e</sup>–XV<sup>e</sup> s.** | Gascogne disputée pendant la guerre de Cent Ans ; réseau de castelnaux et bastides (Bassoues et son donjon XIV<sup>e</sup>, Beaumarchés 1288, Marciac 1298) | Circulation monétaire anglo-gasconne et française, passages de routiers, dépôts de crise |
| **XVI<sup>e</sup> s.** | La Case-Dieu ravagée par un **incendie en 1558**, attaquée par les **protestants en 1570** ([Wikipédia](https://fr.wikipedia.org/wiki/Abbaye_de_la_Case-Dieu)) | Guerres de Religion actives localement → dépôts monétaires d'enfouissement de crise |
| **Révolution** | Disparition de l'abbaye ; fusion Armous + Cau 1790-94 | Ventes de biens nationaux → réorganisation parcellaire lisible dans le cadastre napoléonien |
| **XIX<sup>e</sup>–XX<sup>e</sup> s.** | Église actuelle bâtie des pierres des deux anciennes ; dépeuplement continu (95 hab.) | Fermes et métairies abandonnées, repérables par différentiel Cassini / état-major / ortho 1950 / ortho actuelle |

### 2.4 Le corridor de circulation

La **Via Tolosana (GR 653, voie d'Arles)** traverse le secteur : Auch → Barran → L'Isle-de-Noé → **Montesquiou** → **Bassoues** → **Marciac** → **Maubourguet** ([gr-infos](https://www.gr-infos.com/en/gr653.htm), [hikamp](https://www.hikamp.com/randonnee/gr653-la-via-tolosana/gr653-la-via-tolosana-section-6-de-auch-a-oloron-sainte-marie/)).

Un chemin de pèlerinage fréquenté pendant des siècles par des marcheurs porteurs de petite monnaie est un générateur classique de perte d'objets, surtout aux points de friction : gués, carrefours, abords d'hôpitaux et d'aumôneries, sorties de bourg.

**[À VÉRIFIER — priorité haute]** : la distance exacte entre Armous-et-Cau et le tracé du GR 653, **et surtout** le tracé *médiéval*, qui ne coïncide pas nécessairement avec le balisage moderne. Le GR est un itinéraire de randonnée contemporain ; les variantes anciennes se lisent sur Cassini et dans la toponymie (`camin roumiou`, `camin ferrat`, `hourc`).

### 2.5 Toponymie : l'atout technique sous-exploité

La zone est de langue **gasconne**. Un agent qui cherche des microtoponymes français (« la Motte », « le Châtel ») **rate l'essentiel**. Lexique à appliquer aux états de sections du cadastre napoléonien :

| Forme gasconne | Sens | Ce que ça signale |
|---|---|---|
| `castèra`, `casterar` | enceinte, tertre fortifié | motte castrale, enceinte protohistorique |
| `mothe`, `mote`, `mouta` | motte | motte castrale |
| `tuc`, `tucòu`, `tuquet` | butte, tertre | tumulus, motte, point haut occupé |
| `pujòu`, `poujol` | hauteur | site de hauteur |
| `glèisa`, `gleyse`, `gleysette` | église | **église disparue** |
| `cementeri`, `simetière`, `carnal` | cimetière | nécropole |
| `teulèra`, `teulé` | tuilerie | atelier, marqueur de tuile au sol |
| `hourc`, `fourc` | fourche, carrefour | carrefour ancien |
| `hourgue`, `fargue` | forge | atelier métallurgique — scories |
| `bidau`, `bidalot` | de *via* | voie ancienne |
| `abadie`, `mounja`, `monge` | abbaye, moine | dépendance monastique (La Case-Dieu) |
| `hospitau`, `espitau` | hôpital, aumônerie | halte de pèlerinage |
| `sauvetat`, `sauveté` | sauveté | habitat groupé d'origine ecclésiale |
| `borde`, `bordeneuve` | métairie | ferme, souvent disparue |
| `casau` | jardin, enclos | pourtour d'habitat |
| `pèira`, `peyre`, `peyrelongue` | pierre | mégalithe, borne |
| `sarrat` | crête | implantation de hauteur |
| `gravette`, `graves` | graviers | terrasse alluviale, gué |
| `caussada`, **Caussade** | de *calciata* | **voie antique empierrée** — [étymologie confirmée](https://www.caussade-chambredhotes-lacadanellau.com/histoire-et-d%C3%A9couverte-de-caussade/) |
| `hont`, `hount`, **Hountan** | fontaine, source | source, souvent christianisée |
| **suffixes `-an`, `-ac`** | *fundus* + *-anum* | **domaines gallo-romains** — le marqueur le plus productif de villa en Gascogne. C'est le sujet même de [Polge, *Appellations de domaines antiques dans le département du Gers*](https://www.persee.fr/doc/rio_0048-8151_1965_num_17_1_1876) (1965) |

### 2.5bis Relevé de départ — toponymes lus sur la carte IGN (2026-08-08)

Moisson gratuite faite sur une capture d'écran, avant même la visite aux AD32. **T2.3 démarre là-dessus au lieu de partir de zéro.**

**Rang 1 — à vérifier en priorité**
| Toponyme | Lecture | Statut |
|---|---|---|
| **Caussade** | voie antique empierrée (*calciata*) | [FAIT] étymologie ; localisation à caler |
| **le Téoulé** | tuilerie (`teulèr`) — atelier de tegulae, accompagne souvent une villa | [FAIT] lexique |
| **la Tuilerie** | idem, forme française, NE de la commune | [FAIT] lexique |
| **Hountan** | source/fontaine (`hont`) | [FAIT] lexique |
| **Saint-Mesplin**, **Saint-Lanne** | vocables de saints hors bourg = **chapelles ou églises disparues possibles** | [HYPOTHÈSE] — croiser avec le *Répertoire des patronages* de Polge (T2.4). Piste sérieuse pour Armous ou Cau |
| **la Croix de…** | croix de chemin, souvent posée à un carrefour ancien | [HYPOTHÈSE] |
| **Bazian** | suffixe `-an` → *Basianum*, domaine gallo-romain | [HYPOTHÈSE] — motif documenté, attribution à confirmer |

**Rang 2 — à travailler**
`Bilas` ([HYPOTHÈSE] < *villa* ? le latin *villa* donne bien des toponymes gascons, mais l'attribution demande vérification) · `Caubet` ([HYPOTHÈSE] lien avec le village disparu de **Cau** ? attention, `cau` = creux/abri en gascon — piège classique) · `Larrébéou` (`larr-` = lande) · `Cabos`, `Cambos` (*campos* ?) · `Bois de Caumont` · `Crout z` (`crotz` = croix ?) · `Soulas` · `Rozès` · `Barrotes` · `le Perdigué` · `le Husté` · `le Tourneur` · `Naudoun` · `Jougla` · `Louiset` · `Couentat` · `Catuhet` · `Bougères` · `le Hajau` · `Haouré`

**Avertissement, toujours le même** : en Gascogne le nom de domaine est souvent un patronyme (Polge). Aucune de ces lectures n'est acquise avant confrontation aux formes anciennes du cadastre et aux fichiers Polge.

Le relevé exhaustif des microtoponymes d'un cadastre napoléonien communal est une **méthode établie** pour repérer mottes et enclos ecclésiaux — voir [*Cadastre napoléonien, archéologie et territoires parlés*](https://journals.openedition.org/lbl/9921) et les [relevés de toponymes des Archives de Touraine](https://archives.touraine.fr/document/presentation-releves-toponymes-cadastre). Protocole, pas intuition.

---

## 3. État de l'art — ce qui existe déjà

Recherche du 2026-08-08 : 497 dépôts GitHub « metal-detecting » balayés, topics `archaeology`+`gis`, plus recherche web.

### 3.1 Le seul concurrent technique sérieux

**[`nico579/lidar2map`](https://github.com/nico579/lidar2map)** — GPL-3.0, actif (commit du 2026-08-08), 22 pays. Génère des cartes de relief bare-earth depuis les LiDAR nationaux : hillshade multidirectionnel, pente, **Sky-View Factor**, openness, **Local Relief Model**, RRIM, VAT, e4MSTP ; ajoute raster IGN et vecteurs OSM/BD TOPO ; exporte en MBTiles / OsmAnd / RMAP / Mapsforge / GeoJSON. Python 3.12 + GDAL.

Deux points décisifs :
1. **Il ne fait pas ce qu'on veut** : scripts desktop, pas de web app, pas de GPS, pas de log de trouvailles, pas de scoring prédictif, pas de superposition interactive de cartes anciennes.
2. **Il exclut explicitement la détection de métaux** de son périmètre.

**Conséquence anti-vendoring** (règle racine, zéro exception) : **ne jamais copier une ligne de `lidar2map`** — GPL-3 contaminerait le repo public. Deux voies :
- **(a) préférée** : réimplémenter SVF / LRM / openness depuis les **publications** (algorithmes publiés, librement réimplémentables) avec GDAL + numpy dans `tools/prep/`. Vérifier la licence de `rvt-py` (Relief Visualization Toolbox) — si permissive, l'utiliser **en dépendance versionnée**.
- **(b) acceptable** : documenter `lidar2map` comme **outil externe optionnel** dans le README, invoqué par l'utilisateur, jamais bundlé ni importé.

### 3.2 Références utiles

- [`OpenLidarToolbox`](https://github.com/stefaneichert/OpenLidarToolbox) et [`LiDARch`](https://github.com/MCarreroPazos/LiDARch) — plugins QGIS de visualisation LiDAR archéo. **Référence d'algorithmes et de paramètres** (rayons SVF, fenêtres LRM), pas à copier.
- [`awesome-historical-maps`](https://github.com/stark1tty/awesome-historical-maps) — catalogue de cartes historiques géoréférencées, à dépouiller côté France.
- [`thanados`](https://github.com/thanados-network/thanados) — front Leaflet pour données archéo. Utile pour le **modèle de données** de mobilier.

### 3.3 Côté « app de détection »

Rien de sérieux en open source : les 497 résultats sont des scripts de jeu FiveM, des magnétomètres de téléphone et de la détection de défauts métallurgiques. Les concurrents réels sont propriétaires ([LuckyFind](https://getluckyfind.com/), Tect O Trak) et **faibles sur les cartes anciennes** — c'est le différenciateur.

**Le créneau est libre.** Rien sur quoi se greffer : on construit.

---

## 4. Sources de données

### 4.1 Cartes et fonds (WMTS/WMS, licence Etalab 2.0, attribution « IGN » obligatoire)

| Couche | Identifiant WMTS | Usage | Statut |
|---|---|---|---|
| Carte de Cassini (1756-1815) | `GEOGRAPHICALGRIDSYSTEMS.CASSINI` — préfixe possible `BNF-IGNF_` | Bâti, moulins, chapelles, chemins du XVIII<sup>e</sup> | **[À VÉRIFIER]** id exact **`[MACHINE LOCALE]`** |
| Carte d'état-major (1820-1866) | `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` | Pivot : bien plus précis que Cassini, antérieur au remembrement | [FAIT] |
| Plan IGN actuel | `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` | Repérage terrain | [FAIT] |
| Orthophoto actuelle | `ORTHOIMAGERY.ORTHOPHOTOS` · TMS **`PM_0_19`** · `image/jpeg` · style `normal` · **z0-19** | Marqueurs de sol, accès | **[FAIT — capabilities vérifiées 2026-08-08]** |
| Ortho très haute résolution | `THR.ORTHOIMAGERY.ORTHOPHOTOS` · TMS `PM_6_21` · **z6-21** | Deux niveaux de zoom de plus que la BD ORTHO — utile sur un marqueur de sol repéré | **[FAIT]** |
| **Ortho infrarouge (IRC)** | `ORTHOIMAGERY.ORTHOPHOTOS.IRC` · TMS `PM_6_19` | **Détection de traces phytographiques** — voir §4.1bis | **[FAIT]** |
| **Millésimes annuels** | `ORTHOIMAGERY.ORTHOPHOTOS.IRC-EXPRESS.2024 / .2025 / .2026`, `.RVB-EXPRESS.2025 / .2026`, `.ORTHO-EXPRESS.2024` · TMS `PM_0_19` | **Analyse multi-temporelle** : une trace n'apparaît que certaines années | **[FAIT]** |
| Orthophotos 1950-1965 | `ORTHOIMAGERY.ORTHOPHOTOS.1950-1965` · TMS `PM` · **`image/png` uniquement** (jpeg → 400) | Avant remembrement — talus, chemins creux, parcellaire ancien | **[FAIT — GetTile 200 vérifié sur la zone le 2026-08-08]**. Absente de l'annexe `ortho.xml` mais présente au GetCapabilities global — les annexes thématiques ne listent pas tout. Bornes de zoom [À VÉRIFIER] (prévoir `maxNativeZoom`) |
| Parcellaire cadastral | `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` | Repérage des parcelles | [FAIT] |

Capacités : `https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities` et l'annexe `https://data.geopf.fr/annexes/ressources/wmts/cartes.xml`. La Cassini a été renumérisée en **400 dpi** depuis l'exemplaire BnF en novembre 2024 ([geoservices IGN](https://geoservices.ign.fr/actualites/2024-11-carte-de-cassini)). **`[MACHINE LOCALE]`** — bloqué par le proxy ici.

### 4.1bis L'infrarouge multi-millésime — trouvaille de la vérification du 2026-08-08

Le dépouillement des capabilities a sorti quelque chose que je n'avais pas anticipé et qui vaut mieux que ce que j'avais prévu au rang C du scoring.

**L'infrarouge fausses couleurs (IRC) est le canal standard de détection des traces phytographiques.** Le proche infrarouge mesure l'activité chlorophyllienne et perçoit mieux l'humidité du sol : une structure enfouie modifie la réserve en eau, donc le stress hydrique de la culture qui pousse au-dessus, donc sa réponse en infrarouge — souvent bien avant que quoi que ce soit ne soit visible à l'œil en RVB. C'est une méthode publiée, pas une astuce ([*Near-Infrared Aerial Crop Mark Archaeology*, J. Archaeol. Method Theory](https://link.springer.com/article/10.1007/s10816-011-9104-5)).

**Et l'IGN sert des millésimes annuels** : IRC 2024, 2025, 2026 et RVB 2025, 2026. C'est le point qui change la donne, parce qu'une trace phytographique **n'apparaît pas tous les ans** — il faut la bonne culture, le bon stade de croissance et un déficit hydrique suffisant. Comparer trois années consécutives multiplie mécaniquement les chances d'en attraper une. L'analyse multi-temporelle de crop marks est une méthode reconnue en télédétection archéologique.

**Honnêteté sur la portée** : la littérature note que l'imagerie NIR archéologique est restée d'un usage limité, aux « résultats incertains ». Ce n'est pas une baguette magique — c'est un canal supplémentaire, gratuit, déjà servi en WMTS, dont il serait absurde de se priver. À traiter comme un indice de plus, pas comme une preuve.

Conséquence concrète : le rideau de comparaison de T1.1 doit pouvoir enchaîner **IRC 2024 → 2025 → 2026** sur la même vue. Une trace qui apparaît une seule année sur les trois, au bon endroit, est un signal fort.

### 4.2 LiDAR HD

MNT **0,5 m**, dalles **1 km × 1 km**, ~200 Mo en COPC.LAZ, **open data Etalab 2.0**, mention obligatoire « **IGN – Programme LiDAR HD** ». Fin 2025 : ~80 % du territoire métropolitain couvert ([cartes.gouv.fr](https://cartes.gouv.fr/aide/fr/partenaires/ign/observations-regulieres-territoire/relief/mnt-lidar-hd/), [IGN](https://www.ign.fr/institut/programme-lidar-hd-vers-une-nouvelle-cartographie-3d-du-territoire)).

**[À VÉRIFIER — bloquant phase 3]** : couverture effective du **Gers**. Carte de suivi : `macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD`. **`[MACHINE LOCALE]`**. Si le Gers n'est pas couvert → repli sur **RGE ALTI 1 m**, avec la limitation écrite dans le README, sans surestimer ce que le résultat permet de voir.

Le LiDAR archéologique fonctionne : trois protocoles de détection automatisée d'anomalies micro-topographiques appliqués aux MNT LiDAR HD en vallée de l'Eure, résultats publiés ([HAL](https://hal.science/hal-05042607)).

### 4.3 Archives et sources historiques

| Source | Contenu | Accès |
|---|---|---|
| **AD Gers** | Cadastre napoléonien (plans, **états de sections**, matrices), ~400 cartes et plans numérisés, **atlas cantonaux de l'an XI (1802-03)** | Portail AD32 ; salle de lecture à Auch. [Département du Gers](https://www.gers.fr/le-territoire/culture-et-patrimoine/archives-departementales-memoires-du-coeur-de-gascogne), [RFG](https://www.rfgenealogie.com/infos/le-gers-met-en-ligne-de-nouveaux-cartes-et-plans) |
| **Atlas des patrimoines** | Entités archéologiques, opérations, ZPPA, monuments historiques et périmètres — base **Patriarche** | [atlas.patrimoines.culture.fr](https://atlas.patrimoines.culture.fr/) — **[À VÉRIFIER]** : WMS/WFS exploitable, ou export manuel ? |
| **Gallica / BnF** | Feuilles Cassini haute résolution, cartes antérieures au XVIII<sup>e</sup> | [Cassini sur Gallica](https://gallica.bnf.fr/selections/fr/html/carte-de-cassini) |
| **Société archéologique du Midi** | Monographie sur La Case-Dieu, t.64 | [PDF direct](https://societearcheologiquedumidi.fr/_samf/memoires/t_64/balagna.pdf) |
| **CAG 32 — Le Gers** | **Carte archéologique de la Gaule**, vol. 32, Lapart & Petit, AIBL 1993, 354 p., ISBN 978-2-87754-019-3. Pré-inventaire des découvertes de l'âge du Fer au haut Moyen Âge, **commune par commune, site par site** | [AIBL](https://aibl.fr/collections/carte-archeologique-de-la-gaule-32-le-gers/), [FRANTIQ](https://catalogue.frantiq.fr/cgi-bin/koha/opac-detail.pl?biblionumber=690365). La série est partiellement sur [Gallica](https://gallica.bnf.fr/selections/fr/html/carte-archeologique-de-la-gaule) — **[À VÉRIFIER]** si le vol. 32 y est |
| **Bulletin de la Société archéologique du Gers** | Trimestriel **depuis 1900**, société fondée à Auch en 1891. Un siècle de signalements de découvertes locales, commune par commune | **65 années en ligne sur [Gallica](https://gallica.bnf.fr/ark:/12148/cb34426497s/date)**, plus [Internet Archive](https://archive.org/details/bulletindelasoc04gersgoog). Archives de la société déposées aux AD32, collections au musée d'Auch |
| **Fichiers Henri Polge (AD32)** | Polge, directeur des AD32 de 1948 à 1978, a laissé trois fichiers : **Dictionnaire topographique du Gers**, **Dictionnaire archéologique du Gers**, et un **Répertoire des patronages anciens et modernes des églises et chapelles** | AD32, salle de lecture. Voir aussi ses travaux d'onomastique, dont [*Appellations de domaines antiques dans le département du Gers*](https://www.persee.fr/doc/rio_0048-8151_1965_num_17_1_1876) (1965) |
| **DicoTopo (CTHS)** | Version numérique des dictionnaires topographiques départementaux | [dicotopo.cths.fr](https://dicotopo.cths.fr/about) |
| **BRGM InfoTerre** | Géologie (molasse, terrasses alluviales) | Corrélation implantation antique / substrat **et** calibrage des presets de sensibilité (§9.8) : la minéralisation conditionne le seuil de faux signaux |
| **RPG** | Registre parcellaire graphique : cultures déclarées | Distinguer labour (mobilier remonté, sol pénétrable) de prairie permanente |
| **Open-Meteo** | Historique de précipitations, humidité du sol (ERA5-Land depuis 1940), **sans clé d'API**, 10 000 appels/jour gratuits | [Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) — alimente la fenêtre de sortie (§9.3) |

### 4.4 Les sources humaines — que j'avais complètement oubliées

Le manque le plus visible de ma première version : **tout passait par des archives et des flux WMTS, aucune par quelqu'un qui connaît le terrain**. C'est une erreur de méthode, parce que les deux contacts ci-dessous coûtent un appel et peuvent économiser des semaines de dépouillement.

- **L'exploitant qui laboure les parcelles.** Il retourne cette terre depuis des décennies et sait exactement où « ça fait des cailloux », où la charrue accroche, où la tuile remonte. Une concentration de tegulae signalée par un agriculteur vaut trois mois de croisement cartographique. C'est aussi la personne à qui parler pour accéder au champ.
- **La Société archéologique, historique, littéraire et scientifique du Gers** (Auch, fondée 1891, [site](https://www.societearcheologiquehistoriquelitteraireetscientifique.com/)). Ses membres connaissent la bibliographie locale et les découvertes anciennes non publiées. Attention au positionnement : une société savante est généralement hostile à la détection de loisir. Se présenter comme s'intéressant à l'histoire de la commune donnera de meilleurs résultats que d'ouvrir sur le détecteur.
- **La mairie et les anciens de la commune** (95 habitants — tout le monde se connaît). Emplacement de l'ancienne église, souvenirs de fondations rencontrées en creusant, noms de parcelles encore employés.

[HYPOTHÈSE] sur le rendement relatif de ces pistes : je pense qu'un après-midi de conversations vaut plus que le dépouillement du Bulletin, mais c'est un raisonnement, pas une mesure. À toi de juger — tu connais le milieu local, pas moi.

**Point capital sur le cadastre napoléonien** : les plans des AD ne sont **pas géoréférencés**. Calage manuel nécessaire (amers : angles d'église, croisements de chemins, limites parcellaires pérennes). Travail long, et c'est le prix d'entrée du meilleur prédicteur du projet. Outil de calage dans `tools/prep/`, ou QGIS + export GeoTIFF → PMTiles.

---

## 5. Architecture — et pourquoi

### 5.1 La décision — révisée le 2026-08-08

**PWA local-first sur Railway + Supabase pour les données et les photos.**

Oscar a signalé qu'il enregistre déjà facilement en base sur ses autres projets et qu'il a le **CLI Supabase**. Il avait raison de le dire : ma version précédente construisait un service Fastify, un schéma, des migrations et un endpoint de sync à la main. **Supabase supprime tout ça** — PostgREST expose la base directement, `supabase-js` parle depuis la PWA, et les **Storage buckets** règlent le stockage des photos, qui était la partie la plus pénible du lot.

Répartition : **Railway héberge la PWA** (statique, son terrain de jeu habituel), **Supabase porte les données et les photos**. Chacun fait ce qu'il fait bien, et les deux CLI sont déjà installés.

Ce qui reste à écrire de toute façon : **la file de synchronisation côté client**. Elle est inévitable quel que soit le backend, parce qu'elle existe pour survivre à l'absence de réseau. C'est le seul vrai travail de ce volet.

Un point de vocabulaire à corriger, et il est structurant :

**L'app n'écrit jamais « en direct » dans Postgres.** Une écriture directe suppose un serveur joignable à l'instant du geste — or le geste a lieu dans une cuvette du Gers sans 4G. Le creusage enregistré à 15h serait perdu. Le modèle correct :

```
geste terrain → IndexedDB (immédiat, toujours, hors ligne)
                     ↓
              file de sync (persistée)
                     ↓  dès qu'il y a du réseau
              supabase-js → Postgres + Storage
```

Du point de vue d'Oscar c'est bien « enregistré en direct » : la remontée est instantanée dès qu'il y a du signal, et rien n'est perdu quand il n'y en a pas. **IndexedDB reste la source de vérité pendant la session ; Supabase est la copie durable et le socle des analyses v2.**

Ce que ça change :
- **Plus d'API à écrire.** Le lot T1.7 perd sa moitié serveur : plus de Fastify, plus d'endpoint, plus de jeton porteur maison. Migrations via le CLI Supabase.
- **Les photos sont réglées** par les Storage buckets, au lieu d'un stockage à bricoler.
- **Le risque iOS du §5.5 passe de critique à gérable** : une purge du stockage ne coûte qu'une resynchronisation.
- **Gratuit** au volume de ce projet, contre ~5 $/mois pour un Postgres Railway.
- **Mise en pause après 7 jours d'inactivité** sur le plan gratuit — mais **aucune donnée perdue**, le projet est simplement injoignable jusqu'au réveil (~30 s depuis le dashboard) ([doc](https://supabase.com/docs/guides/platform/free-project-pausing)). Vu l'usage saisonnier, prévoir un **ping hebdomadaire** par cron GitHub Actions (disponible sur le plan gratuit depuis avril 2026). Sans ça, une reprise de saison commence par un réveil manuel — agaçant, pas grave.
- **La sécurité se déplace, elle ne disparaît pas** : la clé `anon` est publique **par conception** et se retrouvera dans le bundle d'un repo public. Ce n'est pas une fuite — **à condition que la Row Level Security soit active**. Sans RLS, clé publique = trouvailles lisibles par n'importe qui. Voir §5.6.

### 5.2 Stack

```
FRONT (PWA)
React 19 + TypeScript + Vite
MapLibre GL JS            → carte, superposition raster, opacité, rideau de comparaison
PMTiles (protomaps)       → archives de tuiles mono-fichier, offline natif
Dexie (IndexedDB)         → SOURCE DE VÉRITÉ terrain + file de sync persistée
vite-plugin-pwa/Workbox   → service worker, cache des tuiles, install
Turf.js                   → géométrie (buffers, surfaces ratissées, grille hexagonale)
Web Worker                → scoring hors du thread UI

DONNÉES (Supabase — aucune API à écrire)
supabase-js               → PostgREST depuis la PWA, upsert par lots
Postgres managé           → copie durable, socle des analyses v2
  + PostGIS               → extension activable en une ligne SQL
Storage buckets           → photos, avec leur propre état de sync
Row Level Security        → OBLIGATOIRE : la clé anon est publique par conception
supabase CLI              → migrations versionnées dans supabase/migrations/

HÉBERGEMENT (Railway)
Site statique             → le dist/ de la PWA, avec les en-têtes du §5.3

OUTILLAGE
tools/prep/ (Python)      → pipeline LiDAR/vecteurs → PMTiles + GeoJSON (hors app, à la main)
```

**Sync — les règles qui évitent les pièges classiques :**
- **Un seul utilisateur, données quasi append-only** → pas de CRDT, pas de résolution de conflit sophistiquée. Chaque entité porte un `id` généré côté client (UUID) : l'API fait un **upsert idempotent**. Rejouer deux fois la même file ne duplique rien.
- **Batch, pas une requête par point.** Une trace produit des milliers de `TrackPoint` ; les envoyer un par un sur une 4G de campagne échouerait. Envoi par lots, avec reprise là où ça s'est arrêté.
- **Les photos ne partent pas avec le reste.** Ce sont elles qui pèsent. Métadonnées d'abord, blobs ensuite et **seulement en wifi**, avec un état de sync distinct.
- **La file survit au rechargement** : elle vit dans IndexedDB, pas en mémoire.
- **Sens unique en v1** : téléphone → serveur. La descente serveur → téléphone n'est utile qu'en multi-appareils, qui n'est pas décidé (§12).

**PMTiles est le choix qui débloque tout** : un fichier par couche, pas de serveur de tuiles, fonctionne en local comme en ligne, requêtes par plage d'octets. Les couches dérivées du LiDAR (hillshade, SVF, LRM) et les vecteurs produits par `tools/prep/` deviennent de simples fichiers versionnés ou attachés à une release GitHub.

### 5.3 Déploiement Railway

Deux CLI, déjà installés chez Oscar.

```bash
# Données
supabase init && supabase link          # projet Supabase
supabase db push                        # migrations depuis supabase/migrations/

# Hébergement de la PWA
railway login && railway init           # projet "treasure-detector"
railway variables --set "VITE_SUPABASE_URL=..." --set "VITE_SUPABASE_ANON_KEY=..."
railway up                              # build + deploy du statique
railway deployment list                 # ← OBLIGATOIRE : attendre SUCCESS
railway domain                          # URL pour installer la PWA sur le téléphone
```

Les deux variables `VITE_*` **sont destinées au client** et finiront dans le bundle : c'est normal et voulu par Supabase. Ce qui ne doit jamais sortir, c'est la clé `service_role`.

Pièges à traiter explicitement dans T0.1 :
- `Service-Worker-Allowed` et **pas de cache long sur `sw.js`** — sinon la PWA reste figée sur une vieille version chez Oscar, sans message d'erreur.
- **Accept-Ranges** requis par PMTiles (requêtes par plage d'octets), à **vérifier réellement** (`curl -H 'Range: bytes=0-99' -I`), pas à supposer : PMTiles échoue silencieusement sinon.
- **Fallback SPA** sur le service statique.

**Rappel non-négociable du CLAUDE.md racine** : *push ≠ déployé*. Le builder Railway échoue **en silence**. Aucun agent n'annonce « en ligne » sans un `railway deployment list` retournant `SUCCESS` **collé en brut**. Deux `FAILED` consécutifs = incident immédiat, pas un détail.

### 5.4 GPS : question tranchée

Oscar prospecte **téléphone en main, carte ouverte** — décision §1. Le tracé en avant-plan suffit donc, et **l'emballage natif sort du périmètre, y compris de la v2**.

Implémentation : `watchPosition` + **Screen Wake Lock API** pour garder l'écran allumé pendant une session, avec avertissement batterie. Deux points restent à traiter parce qu'ils mordront quand même :
- **Coupure d'écran involontaire** (appel entrant, poche, batterie). Le tracé s'interrompt sans erreur. → détecter le retour de `visibilitychange`, **marquer explicitement le trou dans la trace** au lieu de relier les deux bouts par une droite. Une ligne droite de 200 m à travers un champ jamais parcouru est une fausse donnée de couverture, et c'est ce qui pourrit une carte de zones ratissées.
- **Batterie** : deux heures d'écran allumé + GPS continu vident un téléphone. Afficher le niveau et prévenir sous 20 %.

`src/platform/` (`geolocation.ts`, `storage.ts`, `camera.ts`) est conservé — non plus comme porte de sortie vers le natif, mais parce que ça rend le GPS **testable sans marcher dans un champ** : un adaptateur de rejeu de trace enregistrée permet de valider T1.3 et T3.3 depuis un poste de dev.

### 5.5 Persistance des données — le trou qui pouvait tout effacer

**C'est le manque le plus grave que la relecture a sorti, et il est structurel : j'avais mis toutes les données dans IndexedDB sans traiter le fait qu'IndexedDB s'efface.**

Le fait, vérifié : iOS Safari **supprime IndexedDB, localStorage et les enregistrements de service worker après 7 jours** sans interaction avec le site ([WebKit — Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)). Une PWA **installée sur l'écran d'accueil** échappe au compteur de Safari et possède le sien, remis à zéro à chaque usage — mais iOS peut malgré tout purger le stockage d'une PWA restée inutilisée plusieurs semaines. Et `navigator.storage.persist()` n'est pas honoré de façon fiable par Safari.

Pourquoi ça mord précisément ici : la prospection est **saisonnière**. Tu sors à l'automne et en hiver après les labours, puis tu n'ouvres plus l'app de mars à septembre. C'est exactement le profil d'usage qu'iOS purge. Une saison de trouvailles et de traces perdue sans message d'erreur — et avec elle toute la calibration du scoring v2.

**La sync Postgres (§5.1) est la réponse principale à ce risque** : une purge du stockage ne coûte plus qu'une resynchronisation depuis le serveur. Mais elle ne le supprime pas entièrement — il reste une fenêtre où la donnée n'existe **que** sur le téléphone : entre le geste sur le terrain et le premier retour de réseau. Une sortie de trois heures sans signal suivie d'un téléphone noyé ou cassé, et cette sortie est perdue. D'où les filets qui suivent, qui restent nécessaires.

Traitement, par ordre d'importance :
0. **Synchronisation vers Postgres** dès que le réseau revient (§5.1) — la vraie réponse.
1. **Export automatique après chaque session**, sans action d'Oscar : un fichier daté écrit via l'API Fichiers / le partage natif. C'est le filet quand le serveur est injoignable, le jeton expiré, ou Railway en panne. La sauvegarde ne doit **jamais** dépendre du fait de penser à appuyer sur un bouton après trois heures de marche.
2. **`navigator.storage.persist()`** demandé au premier lancement — gratuit, aide sur Android/Chrome, à ne pas considérer comme acquis sur iOS.
3. **Bandeau d'installation** : tant que l'app tourne dans l'onglet Safari et non depuis l'écran d'accueil, elle est sous le couperet des 7 jours. Le dire explicitement, une fois, au premier lancement.
4. **Détection de perte** : au démarrage, si la base est vide alors qu'un export antérieur est connu, proposer la réimportation au lieu de démarrer sur une app vierge comme si de rien n'était.
5. **Photos** : ce sont elles qui remplissent le quota. Compression agressive à l'enregistrement, et compteur d'occupation visible.

### 5.6 Décisions techniques qui manquaient

- **Stockage des artefacts lourds** : ma v1 disait « versionnés **ou** en release » — une indécision, pas une décision. Tranché : **GitHub Releases**, pas Git LFS ni le dépôt. Un PMTiles de hillshade LiDAR sur une commune pèse lourd, et un repo public qui grossit à chaque régénération devient impossible à cloner. `tools/prep/` publie les artefacts en assets de release, l'app les télécharge par URL versionnée.
- **Systèmes de coordonnées** : les tuiles WMTS servies en `PM` sont en Web Mercator (**EPSG:3857**), le stockage applicatif est en **WGS84 (EPSG:4326)**, mais **LiDAR HD, RGE ALTI, cadastre et BD TOPO sont en Lambert-93 (EPSG:2154)**. Toute reprojection se fait dans `tools/prep/`, jamais dans l'app. À écrire noir sur blanc dans `CONTRACTS.md` : un décalage de projection non détecté produit des couches qui s'affichent joliment à quelques dizaines de mètres à côté — l'erreur la plus coûteuse et la plus discrète de tout le projet.
- **Tests** : **Vitest** pour l'unitaire (géométrie, scoring, resolvePreset, migrations), **Playwright** pour le parcours terrain de bout en bout, avec Chromium déjà présent dans l'environnement. Chaque lot livre ses tests, pas seulement son code.
- **Migrations de schéma** : Dexie **et** Postgres versionnés dès la v1, avec une migration d'exemple de chaque côté. Le contrat §6 **va** changer après une saison de terrain ; s'il n'y a pas de chemin de migration, la donnée accumulée devient illisible et c'est le pire moment pour s'en apercevoir. Les deux schémas dérivent du **même** `CONTRACTS.md` — un champ ajouté d'un seul côté est un bug de sync silencieux.
- **Row Level Security — le seul point de sécurité qui compte ici.** La clé `anon` de Supabase est publique par conception et sera dans le bundle d'un repo public. Ça n'est un problème que si RLS est absente ou permissive : sans elle, n'importe qui lit et écrit tes trouvailles. **Activer RLS sur toutes les tables dès la migration initiale**, et vérifier depuis une session anonyme qu'on ne peut rien lire. C'est un test, pas une intention.
- **Auth minimale** : un seul utilisateur → l'auth Supabase par e-mail suffit, et les policies RLS filtrent sur `auth.uid()`. Pas d'OAuth, pas de rôles, pas de comptes multiples tant que §12 n'est pas tranché.
- **La clé `service_role` ne sort jamais** du poste d'Oscar ni des variables CI. C'est elle qui contourne RLS ; dans un bundle front, elle ouvre tout.
- **Scan de secrets en CI** malgré tout : peu coûteux, et il attrape la clé `service_role` collée par inadvertance dans un fichier de config.

### 5.7 Arborescence

```
treasure-detector/
├── README.md · LICENSE (MIT) · CLAUDE.md · llms.txt
├── railway.json · .env.example      # noms des variables, jamais les valeurs
├── supabase/migrations/             # schéma versionné + policies RLS
├── docs/
│   ├── CONTRACTS.md              # ← schémas de données, BLOQUANT
│   ├── SCORING.md                # critères + pondérations + justifications
│   ├── METHODE_TERRAIN.md        # protocole de prospection
│   └── zone/
│       ├── HISTOIRE.md · SOURCES.md · TOPONYMIE.md · CIBLES.md
├── config/
│   ├── zone.json                 # bbox, INSEE, centre — la zone est un PARAMÈTRE
│   └── scoring.json              # pondérations éditables
├── data/
│   ├── derived/                  # PMTiles + GeoJSON générés (versionnés ou release)
│   └── private/                  # GITIGNORÉ — trouvailles, traces
├── tools/prep/                   # pipeline Python (LiDAR, calage, vectorisation)
└── src/
    ├── platform/                 # adaptateurs geolocation / storage / camera
    ├── map/ · geo/ · gps/ · finds/ · scoring/ · zones/ · db/ · ui/
```

**La zone est un paramètre de `config/zone.json`, jamais une valeur en dur.** Armous-et-Cau est la zone pilote, pas une hypothèse d'architecture.

---

## 6. Contrat de données (`docs/CONTRACTS.md` — T0.2, bloquant)

Esquisse à affiner par T0.2, puis **figée** : tout agent des phases 1 et 3 code contre ce contrat.

```ts
type ISODate = string;               // ISO 8601 UTC
type LonLat = [number, number];      // WGS84, ordre GeoJSON

// Porté par TOUTE entité synchronisée. Sans ces champs, pas de sync fiable.
interface Syncable {
  id: string;                        // UUID généré CÔTÉ CLIENT — permet l'upsert idempotent
  updatedAt: ISODate;                // dernière modif locale
  syncedAt?: ISODate;                // null/absent = pas encore remonté
  deviceId: string;                  // utile le jour où il y a un 2e appareil
  deleted?: boolean;                 // suppression logique : un DELETE ne se synchronise pas
}

interface Session {                  // une sortie de prospection
  id: string; startedAt: ISODate; endedAt?: ISODate;
  label?: string; parcels: string[]; // références cadastrales prospectées
  weather?: string;
  soilCondition?: 'labour_frais'|'chaume'|'prairie'|'sec'|'gele'|'humide';
  detector?: { model: string; settings?: string };
}

interface TrackPoint {               // brut du GPS
  sessionId: string; at: ISODate; coord: LonLat;
  accuracyM: number; altitudeM?: number; speedMs?: number;
}

interface SweptArea {                // dérivé : buffer autour de la trace
  sessionId: string; geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  swathWidthM: number;               // défaut 0.9 — voir §6.1
  coverage: 'ratisse' | 'passage_rapide';   // dérivé de la vitesse GPS, voir §6.1
  computedAt: ISODate;
}

// Signal du détecteur — modelé sur le Garrett ACE 250, PAS sur une machine à VDI.
// L'ACE 250 n'affiche AUCUNE valeur numérique de conductivité : une échelle à
// 12 segments, un mode, un cran de sensibilité, un indicateur de profondeur en
// pouces. Un champ `targetId: string` libre perdrait l'information exploitable.
interface DetectorSignal {
  segment: number;                   // 1..12, position du curseur Target ID
  mode: 'all_metal' | 'jewelry' | 'custom' | 'relics' | 'coins';
  sensitivity: number;               // 1..8
  depthIndicatorIn?: 0 | 2 | 4 | 6 | 8;    // lecture "coin depth", en pouces
  repeatable: boolean;               // signal répétable dans les deux sens ?
  tone?: 'bas' | 'moyen' | 'haut';
}

interface DigPoint {                 // un trou creusé — signal, avec ou sans trouvaille
  id: string; sessionId: string; at: ISODate; coord: LonLat;
  accuracyM: number; depthCm?: number;
  signal?: DetectorSignal;
  presetId?: string;                 // preset actif au moment du creusage — voir §9.8
  outcome: 'rien' | 'ferraille' | 'trouvaille';
  findId?: string; note?: string;
}

// Réglage recommandé pour un endroit donné. Calculé, pas saisi. Voir §9.8.
interface DetectorPreset {
  id: string;                        // 'coeur_village', 'villa_champ_ouvert', ...
  label: string;                     // affiché en gros sur le terrain
  mode: DetectorSignal['mode'];
  sensitivity: [number, number];     // fourchette 1..8, borne basse = si ça bavarde
  notch: 'aucune' | 'fer_bas_seulement';
  coil: 'stock_6.5x9' | 'sniper_4.5';
  sweep: 'tres_lent' | 'lent' | 'normal';
  digRule: string;                   // « creuse tout signal répétable, même faible »
  expect: string[];                  // mobilier attendu — cadre l'oreille
  why: string;                       // le critère de score qui a déclenché ce preset
}

// Observation de surface — SANS creusage ni détecteur. Voir §9.2.
// Manquait à ma v1 : le modèle ne connaissait que le métal, alors que la
// tuile et la céramique au sol sont le moyen le moins cher de confirmer un site.
interface SurfaceObservation {
  id: string; sessionId: string; at: ISODate; coord: LonLat;
  kind: 'tegulae' | 'imbrex' | 'ceramique_commune' | 'sigillee' | 'mortier'
      | 'silex' | 'scorie' | 'pierre_taillee' | 'os' | 'autre';
  density: 'isole' | 'diffus' | 'concentre' | 'tres_dense';
  collected: boolean;                // ramassé ou laissé en place
  photos: string[]; note?: string;
}

interface Find {
  id: string; digPointId: string; at: ISODate;
  category: 'monnaie'|'fibule'|'boucle'|'applique'|'plomb'|'bague'|'militaria'
          | 'outil'|'ferrure'|'indetermine'|'autre';
  material: 'or'|'argent'|'billon'|'bronze'|'cuivre'|'plomb'|'fer'|'etain'|'autre';
  period?: 'prehistoire'|'protohistoire'|'antique'|'medieval'|'moderne'|'contemporain'|'indetermine';
  depthCm?: number; photos: string[];        // clés de blobs IndexedDB
  description?: string;
}

interface ScoreCell {                // sortie du moteur de scoring
  h3: string;                        // index de cellule hexagonale
  score: number;                     // 0..100
  contributions: { criterion: string; weight: number; value: number; evidence: string; source?: string }[];
  flagged?: { reason: 'ZPPA'|'MH'|'site_classe'|'bati'; detail: string };
}
```

**Invariants à faire respecter par le code, pas par la discipline** :
1. Un `Find` **ne peut pas exister sans `DigPoint`**. On enregistre le trou avant l'objet — sinon on perd la localisation, et l'objet n'apprend plus rien au modèle.
2. Les `DigPoint` d'`outcome: 'rien'` sont **aussi précieux que les trouvailles** : ce sont les négatifs qui calibreront le scoring en v2. Ne jamais les traiter comme du bruit à purger.
3. Tout export inclut sa `swathWidthM`, sa `coverage` et son `accuracyM` : une trace à 15 m de précision ne vaut pas une trace à 3 m, et le fichier doit le dire.
4. **Toute entité persistée étend `Syncable`.** Un `id` généré côté serveur casserait l'idempotence : le client doit pouvoir rejouer sa file sans créer de doublons.
5. **Une suppression est un `deleted: true`, jamais un `DELETE` local silencieux** — sinon l'entité effacée sur le téléphone ressuscite à la prochaine sync descendante.
6. **La sync ne modifie jamais la donnée métier.** Elle ne touche que `syncedAt`. Un bug de sync ne doit pas pouvoir corrompre une trouvaille.
7. **Aucune interpolation en ligne droite à travers un trou de trace.** Écran coupé, perte de signal GPS → segments distincts, pas un segment continu. Une droite inventée à travers un champ non parcouru est une fausse couverture.

### 6.1 Largeur de bande et honnêteté de la couverture

Correction d'une erreur de ma première version du plan : j'avais posé `swathWidthM: 1.0` **avant de connaître la machine**. Le disque de l'ACE 250 mesure **6,5"×9", soit 17 × 23 cm**. Le GPS suit le corps d'Oscar, pas le disque.

Ce qui est réellement couvert en un passage, c'est **l'arc de balayage** — de l'ordre de 0,9 à 1,2 m si le balayage est ample et l'avancée lente. Mais l'arc n'est couvert *que si l'avancée entre deux balayages est inférieure à la largeur du disque*. En marchant vite, on trace une bande de 1 m sur la carte tout en n'ayant réellement passé le disque que sur des festons disjoints. **La carte dirait « ratissé » là où rien ne l'a été** — et un mois plus tard cette zone est écartée à tort.

Décision : `swathWidthM` par défaut à **0,9**, réglable. Et un champ `coverage` dérivé de la vitesse GPS :
- vitesse moyenne du segment **≤ 0,45 m/s** (~1,6 km/h, allure de quadrillage discipliné) → `ratisse`
- au-dessus → `passage_rapide`, rendu en hachuré et non en plein, et **ne bloquant pas** un repassage ultérieur

Seuil **[HYPOTHÈSE]** : 0,45 m/s est mon estimation d'une allure de quadrillage avec 50 % de chevauchement sur un disque de 23 cm. À calibrer sur les premières traces réelles d'Oscar — c'est exactement le genre de valeur que je ne peux pas déduire depuis un bureau.

---

## 7. Moteur de scoring (`docs/SCORING.md` + `config/scoring.json`)

Grille hexagonale H3, résolution ~10 (~65 m de côté) [À VÉRIFIER : calibrer sur la taille réelle des parcelles locales]. Chaque cellule reçoit un score 0-100 **et la liste de ses contributions** — le panneau « pourquoi cette zone est chaude » est la raison d'être du choix heuristique contre le ML.

### Critères et pondérations de départ

Poids **initiaux, à valider par Oscar** — ils encodent un jugement sur ce qui paye en prospection, et sur ce terrain son jugement prime sur mon raisonnement.

**Rang A — habitat disparu (25-30)**
| Critère | Poids | Source |
|---|---|---|
| Noyau villageois disparu d'**Armous** (site de l'église XI<sup>e</sup>) | 30 | T2.1 + calage cadastre |
| Noyau villageois disparu de **Cau** (site de l'église) | 30 | idem |
| Bâti présent sur Cassini ou état-major et **absent aujourd'hui** (fermes, métairies, chapelles) | 25 | différentiel numérisé, T3.1 |
| **Moulin** figurant sur Cassini/état-major + bief + gué associé | 22 | Cassini porte les moulins |
| Grange monastique de La Case-Dieu **[HYPOTHÈSE]** | 20 si confirmée, **0 sinon** | cartulaire, AD32 |
| **Zone de source du Midour** — foyer d'implantation, sanctuaire de source possible | 25 | §2.1, confirmé 2026-08-08 |
| **Caussade** — voie antique empierrée (*calciata*), et ses abords | 24 | §2.5bis, étymologie confirmée |
| **le Téoulé / la Tuilerie** — ateliers de tuiles, marqueurs de villa | 20 | §2.5bis |
| **Saint-Mesplin / Saint-Lanne** — vocables hors bourg = culte disparu possible | 18 si confirmé | §2.5bis, à croiser T2.4 |

**Rang B — indices de position (8-20)**
| Critère | Poids |
|---|---|
| Microtoponyme cadastral de rang 1 (`glèisa`, `cementeri`, `castèra`, `mothe`, `hospitau`) | 20 |
| Microtoponyme de rang 2 (`tuc`, `pujòu`, `teulèra`, `hourgue`, `bidau`, `borde`, `sauvetat`) | 12 |
| Voie ancienne (Cassini, alignements parcellaires, chemin creux) et **variante médiévale de la Via Tolosana** | 18 |
| Carrefour ancien, gué, franchissement | 15 |
| Implantation type villa gallo-romaine : rebord de plateau ou mi-pente, exposition S/SE, < 200 m d'une source, substrat de molasse | 18 |
| Source, fontaine (souvent christianisée) | 12 |
| Limite de paroisse / de commune ancienne | 8 |

**Rang C — télédétection (15-20)**
| Critère | Poids |
|---|---|
| Anomalie micro-topographique LiDAR (SVF + LRM + openness) : enclos, talus, plateforme, chemin fossile | 20 |
| Marqueur de sol en orthophoto : tache claire de tuile/calcaire broyés dans une parcelle labourée | 18 |
| Trace de croissance différentielle sur **orthophoto 1950-65** (avant remembrement) | 15 |

**Modulateurs d'accessibilité (multiplicateurs)**
| Facteur | Effet | Raison |
|---|---|---|
| Parcelle en labour (RPG) | ×1,3 | mobilier remonté, sol pénétrable |
| Prairie permanente | ×0,8 | sol non perturbé, objets non remontés |
| Bois | ×0,6 | LiDAR excellent, détection pénible |
| Bâti actuel, voirie, cimetière en service | ×0 | inaccessible |

**Zones signalées (affichées, pas bloquantes)**
ZPPA · monuments historiques et périmètres · sites classés ou inscrits. Affichées en surcouche pour information — deux usages concrets : ne pas gaspiller une sortie, et **valider la méthode** (voir ci-dessous). Aucun blocage dans l'app.

**Ce que le scoring ne doit pas faire** : prédire les sites *déjà connus* de la base Patriarche — ils sont fouillés, protégés et sans intérêt pour toi. Les entités connues servent de **jeu de validation** (« mon scoring retrouve-t-il des sites connus qu'il n'avait pas en entrée ? »), jamais de cible.

---

## 8. Découpage en lots pour agents sonnet

Disciplines de fan-out du CLAUDE.md racine, appliquées sans négociation : **contrat d'abord** · **1 agent = 1 fichier** · **review = N lentilles** · **integration-check final obligatoire**.

Modèles : `sonnet` pour code et recherche · `haiku` pour lookup pur · `opus` seulement sur T0.2 (le contrat conditionne tout le reste). **Toujours passer `model` explicitement** — un `Agent` sans ce champ hérite du modèle du parent, donc opus, et ça ne se voit que sur la facture.

### Phase 0 — Fondations · séquentiel · bloquant

**T0.1 — Scaffold du repo** · `sonnet` · possède tout sauf `docs/`
Créer le repo public **`treasure-detector`** sous `oscardcstudio-cell` (`gh auth switch` d'abord — double compte, vérifier le remote). MIT. Scaffold Vite + React 19 + TS strict + MapLibre + Dexie + vite-plugin-pwa + Turf. `config/zone.json` rempli pour Armous-et-Cau. `.gitignore` avec `data/private/` et tout `.env`. Service statique Railway avec les en-têtes du §5.3, `railway.json`, `.env.example` (noms seuls), client `supabase-js` initialisé depuis les variables `VITE_*`. CI GitHub Actions : `typecheck`, `lint`, `build`, **scan de secrets**. `README.md`, `CLAUDE.md` du repo, `llms.txt`.
*Acceptation* : `npm run typecheck && npm run build` vert, **sortie brute collée** ; CI verte au premier push ; `railway deployment list` → **`SUCCESS`** ; l'URL Railway affiche une carte MapLibre centrée sur la zone ; les requêtes par plage d'octets sont **vérifiées réellement** (`curl -H 'Range: bytes=0-99' -I`), pas supposées.

**T0.2 — Contrat de données** · `opus` · possède `docs/CONTRACTS.md`, `src/db/schema.ts`
Finaliser §6 : types TS, schéma Dexie avec index, JSON Schema des exports, format des artefacts `data/derived/`, les 3 invariants codés en assertions. **Aucun agent de phase 1 ou 3 ne démarre avant merge de ce fichier.**
*Acceptation* : `docs/CONTRACTS.md` complet ; `src/db/schema.ts` compile ; un test unitaire prouve que créer un `Find` sans `DigPoint` **échoue**.

### Phase 1 — Outil de terrain · 7 agents parallèles · ownership exclusif

**T1.1 — Superposition cartographique** · `sonnet` · possède `src/map/**`
Sources Cassini, état-major, ortho actuelle, ortho 1950-65, plan IGN, hillshade LiDAR. Slider d'opacité par couche, **rideau de comparaison** (swipe), sélecteur de fond, persistance du choix, attribution IGN visible en permanence (obligation Etalab).
*Acceptation* : les 4 fonds historiques s'affichent et se superposent sur la zone. **`[MACHINE LOCALE]`** — non testable en conteneur : exiger une **capture d'écran de la preview Railway**, jamais une affirmation.

**T1.2 — Tuiles offline** · `sonnet` · possède `src/geo/tiles.ts`, `src/sw/**`
Service worker, cache-first sur les tuiles IGN. Bouton « télécharger la zone » : parcours de la pyramide z12→z18 sur la bbox, **estimation de taille affichée avant** lancement, barre de progression, annulation, gestion du quota et de son dépassement. Support PMTiles pour les couches dérivées.
*Acceptation* : en mode avion, la carte de la zone reste navigable de z12 à z18. **Preuve = démo hors ligne, pas un raisonnement sur le code.**

**T1.3 — GPS et zones ratissées** · `sonnet` · possède `src/gps/**`, `src/platform/geolocation.ts`
`watchPosition` derrière l'adaptateur plateforme, Wake Lock, position et cap, cercle de précision, trace en direct, pause/reprise, calcul incrémental du `SweptArea` (buffer Turf, `swathWidthM` défaut **0,9**, réglable). Distinction **`ratisse` / `passage_rapide`** selon le seuil de vitesse du §6.1, rendu plein vs hachuré. **Segments distincts sur coupure** (`visibilitychange`, perte de fix) — jamais d'interpolation en ligne droite. Alerte batterie sous 20 %.
Fournir un **adaptateur de rejeu** de trace GPX enregistrée : c'est ce qui rend T1.3 et T3.3 testables sans aller marcher dans un champ.
**Ajouts issus de la relecture** — sans eux, quadriller un champ nu est impossible :
- **Cap et boussole** (`deviceorientation`), et **guide de bandes** : une fois une direction de quadrillage choisie, afficher les bandes parallèles à suivre et celle en cours. Dans un champ sans repère, marcher droit et espacer régulièrement à l'œil ne fonctionne pas — c'est précisément ce que la carte doit remplacer.
- **Guidage vers une cible** : cap et distance vers un point choisi (cellule chaude, trouvaille antérieure, cible de `CIBLES.md`). Le scoring désigne un endroit ; encore faut-il l'atteindre.
- Affichage permanent d'`accuracyM` (§9.6).
*Acceptation* : le rejeu d'une trace de test produit un `SweptArea` cohérent ; une coupure simulée crée **deux** segments et non un ; une portion parcourue à 1,5 m/s ressort en `passage_rapide` ; le guide de bandes reste lisible en plein soleil.

**T1.4 — Trouvailles et creusages** · `sonnet` · possède `src/finds/**`, `src/platform/camera.ts`
Bouton « creusé ici » **et** bouton « TROUVAILLE » — grands, utilisables avec des gants, atteignables au pouce d'une main. Saisie du `DetectorSignal` **calibrée ACE 250** : sélecteur de segment 1-12 (pas de champ numérique libre), mode parmi les 5 de la machine, sensibilité 1-8, profondeur en pouces (0/2/4/6/8), répétable oui/non. Valeurs par défaut reprises de la session précédente — sur le terrain, personne ne resaisit son mode à chaque trou. Puis catégorie, matière, période, photo, note. Photo compressée en blob IndexedDB. Liste, fiche, édition. Export/import **GeoJSON et GPX**.
*Acceptation* : cycle complet creusage → trouvaille → photo → export → réimport sans perte ; l'invariant « pas de `Find` sans `DigPoint` » tient dans l'UI ; **enregistrer un creusage prend moins de 5 secondes** avec les valeurs héritées — au-delà, ça ne sera pas fait sur le terrain et toute la calibration v2 tombe.

**T1.5 — Sauvegarde et résilience** · `sonnet` · possède `src/backup/**`, `src/platform/storage.ts` · **priorité haute, pas un confort**
Implémenter §5.5 : export automatique horodaté en fin de session, `navigator.storage.persist()`, bandeau « installe-moi sur l'écran d'accueil » tant que l'app tourne dans l'onglet, détection de base vide avec proposition de réimport, compteur d'occupation du stockage, compression des photos. Migrations Dexie versionnées avec une migration d'exemple.
*Acceptation* : effacer la base à la main puis relancer → l'app **propose de restaurer** au lieu de démarrer vierge ; l'export part sans qu'Oscar y pense ; un test de migration prouve qu'une base v1 se relit en v2.

**T1.7 — Supabase et synchronisation** · `sonnet` · possède `supabase/**`, `src/sync/**` · dépend de T0.2
Schéma Postgres dérivé de `CONTRACTS.md`, en migrations versionnées sous `supabase/migrations/` (CLI Supabase). **RLS activée sur toutes les tables dès la migration initiale.** Bucket Storage pour les photos. PostGIS activé.
Côté client : **file de sync persistée dans IndexedDB**, drainée dès que le réseau revient, **upsert par lots** via `supabase-js`, reprise là où elle s'est arrêtée, jamais bloquante pour l'UI. Indicateur d'état visible — *n éléments en attente* — pour qu'Oscar sache d'un coup d'œil si sa sortie est remontée avant de quitter la zone de couverture. Photos synchronisées séparément, **wifi seulement**.
Ajouter un **cron GitHub Actions hebdomadaire** qui ping le projet, pour éviter la mise en pause du plan gratuit pendant l'intersaison.
*Acceptation* : mode avion pendant une session complète, puis retour du réseau → **tout remonte, sans doublon**. Rejouer deux fois la même file ne crée rien (test d'idempotence). Couper le réseau **au milieu** d'un lot → reprise propre. **Depuis une session anonyme, aucune table n'est lisible** — testé, pas supposé. Aucune clé `service_role` dans le dépôt ni le bundle.

**T1.6 — Fenêtre de sortie : quand y aller** · `sonnet` · possède `src/window/**`
Le plan disait où aller, jamais **quand** — alors que c'est ce qui décide si une sortie sert à quelque chose. Croiser trois choses :
- **Précipitations récentes** via [Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api) (sans clé, gratuit) : cumul et humidité du sol sur 7 jours. Sol tassé après pluie = conditions optimales (§9.3).
- **Calendrier agricole** : fenêtres d'accès réelles selon le RPG de la parcelle — après moisson (chaume), après labour, avant semis. Un champ en blé sur pied en juin n'est pas prospectable, quel que soit son score.
- **Lumière** : lever/coucher du soleil, pour dimensionner la sortie.
Sortie : un indicateur simple par parcelle — **maintenant / bientôt / hors saison**, avec la raison.
*Acceptation* : sur une parcelle en céréales, l'app annonce une fenêtre après moisson et pas en mai ; les données de pluie remontent réellement de l'API et sont mises en cache pour l'offline.

### Phase 2 — Dossier historique · 4 agents · parallèle à la phase 1 (documents seulement, aucun conflit de fichiers)

**T2.1 — Dossier historique** · `sonnet` · possède `docs/zone/HISTOIRE.md`
Approfondir §2.3. Cibles nommées : localiser les noyaux d'**Armous** et de **Cau**, statuer sur la **grange de La Case-Dieu** (cartulaire, [monographie SAMF t.64](https://societearcheologiquedumidi.fr/_samf/memoires/t_64/balagna.pdf)), inventorier moulins et métairies disparus, trancher la **distance et le tracé médiéval de la Via Tolosana**, corriger l'**erreur hydrographique** du §2.1. Chronologie sourcée, bibliographie.
*Acceptation* : chaque affirmation porte sa source ; chaque déduction est étiquetée [HYPOTHÈSE]. **Aucune déduction présentée comme un fait** — c'est ce qui compte le plus dans ce lot.

**T2.2 — Inventaire des sources** · `sonnet` · possède `docs/zone/SOURCES.md`
Cotes AD32, URLs, état de géoréférencement, licences, procédure d'accès pour chaque source du §4. Trancher le WMS/WFS de l'Atlas des patrimoines et la **couverture LiDAR HD du Gers** — les deux sont bloquants pour la phase 3.
*Acceptation* : tableau directement exploitable par T3.1 ; les deux points bloquants tranchés, ou signalés comme impasses avec un plan B.

**T2.3 — Toponymie** · `sonnet` · possède `docs/zone/TOPONYMIE.md`
Relevé **exhaustif** des microtoponymes des états de sections d'Armous-et-Cau (AD32), classement par rang selon le lexique gascon du §2.5, interprétation, localisation parcellaire, sortie **GeoJSON** consommable par le scoring.
*Acceptation* : un `toponymes.geojson` où chaque entrée porte sa forme d'origine, son rang, son interprétation et la référence de sa section cadastrale.

**T2.4 — Dépouillement archéologique du secteur** · `sonnet` · possède `docs/zone/CIBLES.md` · **le lot au meilleur rendement de tout le plan**
Dépouiller les sources que ma v1 avait ratées, dans cet ordre :
1. **CAG 32 — Le Gers** (Lapart & Petit, AIBL 1993) : la notice d'Armous-et-Cau et celles des communes limitrophes. Pré-inventaire commune par commune, site par site — c'est la synthèse archéologique de référence du département.
2. **Bulletin de la Société archéologique du Gers**, [65 années en ligne sur Gallica](https://gallica.bnf.fr/ark:/12148/cb34426497s/date) : recherche plein texte sur « Armous », « Cau », « Saint-Christaud », « La Case-Dieu », et les communes voisines. Un siècle de signalements de découvertes.
3. **Fichiers Polge aux AD32** : le *Répertoire des patronages anciens et modernes des églises et chapelles* devrait donner les vocables des deux églises disparues — un vocable oriente la datation et parfois la localisation.
Sortie : `docs/zone/CIBLES.md`, liste de cibles nommées, localisées au mieux, chacune avec sa source et son degré de certitude.
*Acceptation* : chaque cible porte source + niveau de confiance. Une cible sans source est une piste, et doit être écrite comme telle.

**Avertissement méthodologique pour T2.3 et T2.4** : en Gascogne, **le nom d'un domaine est souvent celui de la famille qui le possède** ([Polge](https://www.persee.fr/doc/rio_0048-8151_1965_num_17_1_1876)). Un `borde de Lassalle` renseigne sur un propriétaire, pas sur un type de site. Ne pas surinterpréter les microtoponymes anthroponymiques — c'est le piège classique du relevé toponymique, et il gonflerait le scoring de faux positifs.

### Phase 3 — Données dérivées et scoring · après T0.2 et T2.2

**T3.1 — Pipeline de préparation** · `sonnet` · possède `tools/prep/**` · **`[MACHINE LOCALE]`**
Python + GDAL. Téléchargement des dalles LiDAR HD de la zone ; **réimplémentation** de hillshade multidirectionnel, SVF, openness, LRM (depuis les publications — **jamais depuis `lidar2map`, GPL-3**) ; export PMTiles. Calage des plans cadastraux napoléoniens. Numérisation du bâti disparu par différentiel Cassini / état-major / ortho. Sortie dans `data/derived/`.
*Acceptation* : pipeline reproductible depuis un dépôt propre, documenté commande par commande ; PMTiles chargeables dans l'app. Si le Gers n'est pas couvert en LiDAR HD → RGE ALTI 1 m et **limitation écrite dans le README**, sans surestimer ce qu'on voit.

**T3.2 — Grille de scoring** · `sonnet` · possède `docs/SCORING.md`, `config/scoring.json`
Formaliser §7 : chaque critère avec définition opérationnelle, source de données, poids et **justification du poids**. Pondérations en JSON éditable, rechargeable à chaud.
*Acceptation* : chaque critère est calculable depuis une couche réellement disponible. Un critère sans source de données est **supprimé, pas laissé en attente**.

**T3.3 — Moteur de scoring** · `sonnet` · possède `src/scoring/**`
Web Worker, grille H3, calcul depuis `data/derived/` + `config/scoring.json`, couche de chaleur MapLibre, **panneau « pourquoi » listant les contributions et leurs sources** au tap sur une cellule.
*Acceptation* : le panneau explique chaque cellule chaude de façon vérifiable ; recalcul complet de la zone sous 3 s ; **validation méthodologique** — le scoring retrouve-t-il des entités Patriarche non fournies en entrée ? Résultat écrit dans `docs/SCORING.md`, **y compris s'il est mauvais**.

**T3.5 — Presets de réglage du détecteur** · `sonnet` · possède `src/presets/**`, `config/presets.json` · dépend de T0.2 et T3.3
Implémenter §9.8. `resolvePreset(cell, { landUse, soilCondition })` : sélection du profil depuis le **critère dominant** de la `ScoreCell` (contribution de poids×valeur maximal), modulée par l'occupation du sol (RPG) et l'état du sol déclaré en début de session. Les 8 profils vivent dans `config/presets.json`, rechargeable à chaud — **aucune valeur en dur**. Carte d'affichage terrain : gros caractères, fort contraste, quatre lignes plus le « pourquoi ». Écriture du `presetId` dans chaque `DigPoint` créé.
*Acceptation* : entrer dans une cellule dominée par « noyau villageois disparu » propose All-Metal / 6-7 / sniper ; la même cellule avec `soilCondition: 'humide'` redescend la sensibilité à 4-5 ; le `presetId` est bien persisté sur les `DigPoint` ; modifier `presets.json` change l'affichage sans rebuild. La carte est **lisible d'un coup d'œil bras tendu au soleil** — sinon elle ne servira pas.

**T3.4 — Couche de zones signalées** · `sonnet` · possède `src/zones/**`
ZPPA, monuments historiques et périmètres, sites classés : surcouche informative, activable/désactivable. Aucun blocage, aucun dialogue de confirmation. Sert au repérage et à la validation de T3.3.
*Acceptation* : la couche s'affiche et se masque ; les géométries correspondent aux sources de T2.2.

### Phase 4 — Méthode et intégration

**T4.1 — Protocole de terrain** · `sonnet` · possède `docs/METHODE_TERRAIN.md`
Rédiger §9 en protocole opérationnel. **Passage `meta-redacteur` obligatoire** (règle d'or : tout texte lu par un humain).

**T4.2 — Integration-check final** · `sonnet` · aucun fichier en propre, **droit de veto**
1. `typecheck` + `lint` + `build` — **sortie brute lue**, pas résumée.
2. **Seams** : les 4 modules de phase 1 respectent-ils `CONTRACTS.md` ? Le scoring consomme-t-il les sorties réelles de `tools/prep/` ? Les noms de couches concordent-ils entre `src/map/` et `data/derived/` ? Conflits de *sens*, pas seulement de types.
3. Parcours terrain simulé de bout en bout : session → trace → creusage → trouvaille → photo → export → réimport.
4. Test hors ligne réel (mode avion).
5. `railway up` puis `railway deployment list` → **`SUCCESS` collé en brut**. Installation PWA testée sur le téléphone d'Oscar.
*Sortie* : verdict **go / no-go** écrit. Un no-go bloque l'annonce « fini ».

---

## 9. Méthode de terrain — le volet spécialiste

Substance à développer par T4.1.

### Recherche amont
La règle du milieu est **trois heures de recherche par heure de terrain** ([Metal Detecting World](https://www.metaldetectingworld.com/how_to_research_p1.shtml), [Discover Metal Detecting](https://discovermetaldetecting.co.uk/research/metal-detecting-research-tips-7-essential-resources/)). C'est exactement ce que l'app industrialise : elle transforme un travail d'archives dispersé en une couche cartographique réutilisable, faite une fois.

### Quadrillage
Bandes parallèles, balayage **lent**, **50 % de chevauchement** entre passages. Le gridding est efficace en terrain dégagé — champs, prairies ([Metal Detecting World](https://www.metaldetectingworld.com/how_to_metal_detect_p2.shtml)). Repasser la même zone **perpendiculairement puis à 45°** : l'orientation de la bobine change la détectabilité d'un objet, et un second passage croisé sort régulièrement ce que le premier a manqué. L'app doit **afficher les bandes déjà couvertes** — c'est la fonction qui remplace la mémoire.

### 9.2 Prospection pédestre de surface — l'étape que j'avais sautée

**Avant de sortir le détecteur, on marche le champ en regardant par terre.** C'est la méthode standard de confirmation d'un site, et c'est de très loin la moins chère : après un labour, le mobilier remonte, et **3 ou 4 fragments de tegulae ou d'imbrices suffisent à retenir un secteur** ([CERAMES](https://associationcerames.fr/123-2/prospections/), [ArchéoTours](https://archeo.univ-tours.fr/portfolio-items/les-methodes-de-prospection-archeologique/)).

Protocole rapporté dans la littérature : parcours linéaires **espacés de 20 à 25 m**, juste après labour, après semis ou après moisson ; ramassage exhaustif sur des carrés de ~15 × 15 m quand la densité le justifie. Ce qui signale un site gallo-romain : **tegulae** (tuiles plates à rebord), **imbrices**, céramique commune, et surtout la **sigillée** (céramique fine rouge). Ce qui signale un habitat médiéval : céramique grise, mortier, moellons épars.

Deux raisons pour lesquelles ça doit être dans l'app, pas seulement dans un document :
- Un après-midi de prospection de surface sur les deux noyaux d'Armous et de Cau te dira, **sans creuser un seul trou**, si le scoring vise juste. C'est ta boucle de validation la moins chère.
- La carte de densité de tuile est un prédicteur en soi : elle dessine l'emprise du bâtiment avant le premier coup de bêche.

D'où le modèle `SurfaceObservation` du §6 — la v1 du plan ne connaissait que le métal, ce qui était un angle mort.

### 9.3 Conditions
Optimum : **après labour et après une pluie**. Sol tassé, objets remontés par la charrue, meilleure conductivité, profondeur utile accrue. Éviter le sol gelé ou très sec. Chaume après moisson : bon compromis d'accès.

### Profondeur et lecture du sol
La **couche de labour (0-30 cm)** contient du mobilier déjà déplacé par la charrue — c'est là que se trouve l'essentiel du signal exploitable sur un habitat déserté, et c'est ce que le passage croisé sert à épuiser. En dessous, on est sous labour : les signaux profonds sur un site d'habitat sont souvent structurels (ferrures de construction, clous) plutôt que du petit mobilier. Recentrer l'effort sur la couche labourée est autant un choix de rendement qu'autre chose.

### Le fer n'est pas un déchet
Point que ma v1 laissait passer : sur un habitat ancien, la **répartition des clous et ferrures dessine l'emprise du bâtiment**. Une concentration de clous forgés n'est pas de la ferraille à jeter, c'est le plan de la maison. Le champ `outcome: 'ferraille'` existe déjà dans le contrat — ce qui manquait, c'est la raison de le renseigner *avec sa position* plutôt que de le vider en fin de journée. Sur les deux noyaux d'Armous et de Cau, c'est peut-être la donnée qui localisera les églises disparues.

### Précision GPS — attente réaliste
Un téléphone donne **3 à 10 m** en conditions correctes. Concrètement : tu ne retrouveras pas un trou précis à partir de sa seule coordonnée. Deux conséquences à assumer plutôt qu'à découvrir — les `DigPoint` servent à des **densités et des tendances**, pas à du repérage centimétrique ; et pour une cible à revoir, la photo avec un repère fixe dans le cadre (arbre, poteau, angle de parcelle) vaut mieux que la coordonnée. L'app affiche `accuracyM` en permanence pour que tu saches ce que vaut le point que tu viens de poser.

### Enregistrement
Chaque objet : point GPS, profondeur, **photo in situ avant extraction**, description. Deux raisons pratiques : ça rend ta carte de trouvailles exploitable une saison plus tard, et ce sont ces données qui calibreront le scoring en v2. C'est précisément ce que l'app doit rendre plus rapide que de ne pas le faire — sinon ça ne sera pas fait.

### Creusement
Carotte propre, motte retournée puis remise en place, aucun trou laissé ouvert. Un champ rendu propre est un champ où on peut revenir.

### 9.7 Garrett ACE 250 sur cette zone — le point qui décide du résultat

Specs confirmées : **6,5 kHz**, disque **6,5"×9" PROformance**, échelle de discrimination à **12 segments** (aucune valeur numérique de conductivité), **aucun ground balance**, 8 crans de sensibilité, pinpoint non-motion, lecture de profondeur jusqu'à 8" ([MD-Hunter](https://md-hunter.com/wiki/garrett-ace-250/), [MetalDetector.com](https://www.metaldetector.com/blogs/new_blog/testing-the-garrett-ace-250)).

**Le désaccord entre la machine et la cible, énoncé franchement.** La cible n°1 du projet est un village médiéval déserté. Ce qu'on y trouve, ce sont surtout des **deniers et oboles en billon** — petits, fins, alliage argent-cuivre pauvre, donc **faible conductivité**. Or 6,5 kHz est une fréquence basse-moyenne, orientée vers les cibles grosses et conductrices. L'ACE 250 sortira très bien un liard, un double tournois, une boucle de bronze ou une monnaie moderne ; il sera **nettement moins à l'aise sur un petit billon profond**. Ce n'est pas une raison de changer de machine, c'est une raison d'adapter les réglages — sinon la zone sera déclarée vide alors qu'elle ne l'est pas.

Les conséquences pratiques, par ordre d'impact :

1. **All-Metal, ou discrimination minimale.** Sur un cœur de village, discriminer le fer notche aussi les petits billons et les monnaies coupées, qui répondent bas sur l'échelle. Le mode Coins de l'ACE 250 supprime justement les segments du petit or et du petit fer ([Detector Hero](https://detectorhero.com/blogs/news/how-to-use-garrett-ace-250)) — c'est exactement ce qu'il ne faut pas faire ici. Prix à payer : beaucoup de fer, donc des sorties plus lentes. C'est le prix normal d'un habitat ancien.
2. **Un casque.** C'est le gain gratuit le plus important sur cette machine. La bonne monnaie profonde n'est pas un beau signal net, c'est un **blip faible et râpeux mais répétable** — inaudible au haut-parleur avec du vent dans un champ du Gers.
3. **Creuser les signaux faibles répétables dans les deux sens.** Rescanner sous plusieurs angles avant de décider : les signaux se décalent selon la profondeur et le sol ([TreasureNet](https://www.treasurenet.com/threads/my-guide-to-understanding-ace-250-signals-for-coin-hunting-with-tips.518907/)). Un signal net et fort au milieu d'un village déserté est plus souvent moderne qu'ancien.
4. **Sensibilité 6-7, redescendre à 4-5 si ça bavarde.** L'ACE 250 **n'a pas de ground balance** : dans les argiles et molasses minéralisées du Gers, une sensibilité trop haute produit des faux signaux et un Target ID erratique ([Metal Detector Planet](https://metaldetectorplanet.com/garrett-ace-250-best-settings/)). Mieux vaut 2 cm de moins et des signaux fiables.
5. **Un petit disque sniper** (~4,5", compatible ACE) pour le cœur de village saturé de ferraille : bien meilleure séparation entre un clou et une monnaie à 5 cm l'un de l'autre, et meilleure réponse sur les petites cibles. C'est l'achat à faire avant de changer de détecteur.
6. **Enregistrer le signal, pas seulement l'objet.** Segment (1-12), mode, sensibilité, profondeur indiquée, répétabilité — c'est le champ `DetectorSignal` du §6. Au bout d'une saison, croiser « segment 5, faible, répétable » avec ce qui est réellement sorti de terre donne **ta** table de lecture, propre à ta machine et à ce sol. Aucun forum ne peut te la donner.

**[HYPOTHÈSE]** — la fréquence à laquelle le 6,5 kHz fera réellement rater du billon sur ce sol précis : je ne peux pas la chiffrer depuis un bureau. Elle se mesurera aux premières sorties, en comparant ce qui sort en All-Metal sensibilité haute contre passage normal.

### 9.8 Réglages recommandés selon l'endroit

**Le principe.** Le moteur de scoring sait déjà *pourquoi* une cellule est chaude — c'est tout l'intérêt d'avoir choisi l'heuristique explicable contre le ML. Cette même information détermine le réglage : on ne prospecte pas un cœur de village saturé de clous comme un champ ouvert de villa gallo-romaine. Le preset est donc **dérivé**, pas saisi : `critère dominant de la cellule` + `occupation du sol (RPG)` + `état du sol déclaré en début de session` → réglage.

**La contrainte matérielle qui simplifie tout** : l'ACE 250 n'a pas de ground balance. Il ne reste que quatre leviers — mode, sensibilité, disque, geste. C'est peu, donc un preset tient sur une carte lisible au soleil, d'un coup d'œil, sans lâcher le détecteur.

| Profil de site | Mode | Sens. | Disque | Balayage | Règle de creusage | Attendu |
|---|---|---|---|---|---|---|
| **Cœur de village déserté / site d'église** (Armous, Cau) | All-Metal | 6-7 → 4-5 si ça bavarde | **sniper 4,5"** | très lent, disque au ras, fort chevauchement | **tout signal répétable, même faible et râpeux** | billon, boucles, appliques, plombs, clous à la pelle |
| **Villa gallo-romaine, champ ouvert** (marqueur de tuile) | All-Metal / Relics | 7-8 | stock 6,5"×9" | normal, quadrillage large | signaux médians répétables | bronzes du Bas-Empire, fibules, tuile en surface |
| **Voie ancienne, gué, carrefour** | All-Metal | 6-7 | stock | transects **le long ET en travers** de l'axe | tout — les pertes sont aléatoires sur l'axe | monnaies isolées toutes périodes, ferrures |
| **Moulin, bief, bord de ruisseau** | All-Metal | **5-6** | sniper si ferraille dense | lent | trier : beaucoup de ferraille de mécanisme | fer massif, plomb, monnaies perdues au passage |
| **Prairie permanente, pâture** | All-Metal | 7-8 | stock | très lent, à l'écoute du faible | signaux profonds faibles | cibles **non remontées**, donc profondes, en limite de portée de la machine |
| **Labour frais après pluie** | All-Metal | 7 | stock | normal | rendement maximal, ratisser large | tout — meilleures conditions de la saison |
| **Sol argileux détrempé, ID erratique** | All-Metal | **4-5** | stock | lent | ignorer les ID instables, se fier à la répétabilité | régime de faux signaux : sans ground balance, descendre la sensibilité est la seule parade |
| **Bois** | All-Metal | 6-7 | sniper | lent, entre les racines | tout | LiDAR excellent ici, détection pénible |

**Ce que ça donne à l'écran** : une carte compacte en haut de la carte quand le GPS entre dans une cellule scorée, ou au tap. Gros caractères, contraste fort, quatre lignes — mode, sensibilité, disque, règle de creusage — plus une ligne « pourquoi » qui renvoie au critère de score déclencheur. Pas un menu à fouiller avec des gants.

**Le bouclage, qui est la vraie valeur** : le `presetId` actif est enregistré dans chaque `DigPoint`. Au bout d'une saison, on peut répondre à la seule question qui compte — *est-ce que le réglage recommandé a réellement mieux produit que le réglage habituel ?* Sans ce champ, ce ne sont que des conseils de forum de plus.

**[HYPOTHÈSE — et c'est important]** : les valeurs chiffrées de ce tableau sont ma synthèse de la documentation de l'ACE 250 et des pratiques rapportées, **pas des mesures sur ton sol**. Les fourchettes de sensibilité surtout dépendent de la minéralisation locale, que personne n'a mesurée à Armous-et-Cau. À réviser dès les premières sorties, à partir des `DigPoint` réels. Le tableau vit dans `config/presets.json`, éditable comme les pondérations — pas en dur dans le code.

### 9.9 Sécurité
Munitions et engins non explosés (peu probable dans le Gers, mais des dépôts existent — ne jamais manipuler), plomb, tétanos à jour, gants.

---

## 10. Risques et inconnues à lever

| # | Risque / inconnue | Impact | Action | Qui |
|---|---|---|---|---|
| 1 | **Couverture LiDAR HD du Gers** — carte consultée 2026-08-08, commune **en bleu** = très probablement déjà disponible | Débloque tout le rang C | **[À VÉRIFIER]** : légende tronquée sur la capture, libellé du bleu à confirmer | Oscar |
| 2 | Identifiant exact de la couche **Cassini** | T1.1 bloqué | Annexe **`cartes.xml`** (celle fournie le 2026-08-08 était `ortho.xml`) | Oscar |
| 2b | **Orthos 1950-65 absentes de `ortho.xml`** | Perte de la vue d'avant remembrement en flux | Chercher dans une autre annexe ; sinon export manuel depuis remonterletemps | T2.2 |
| 3 | **Atlas des patrimoines** : WMS/WFS ou pas | T3.4 | Tester ; sinon export manuel versionné | T2.2 |
| 4 | **Calage du cadastre napoléonien** = travail manuel long | Meilleur prédicteur retardé | Chiffrer la charge, découper par section | T3.1 |
| 5 | **Localisation des noyaux d'Armous et de Cau** non résolue | La cible n°1 du projet | Croiser Cassini + état-major + toponymie + LiDAR | T2.1 + T2.3 |
| 6 | **Coupure d'écran** en cours de session (appel, batterie) | Trou de trace relié par une droite = fausse couverture | Segments distincts, jamais d'interpolation (§6.1) | T1.3 |
| 6b | **Seuil de vitesse `ratisse`/`passage_rapide`** posé à 0,45 m/s [HYPOTHÈSE] | Sur/sous-estimation des zones couvertes | Calibrer sur les premières traces réelles | T1.3 + Oscar |
| 6c | **6,5 kHz de l'ACE 250** peu sensible au petit billon médiéval | Zone déclarée vide à tort — le pire échec possible | All-Metal + casque + petit disque (§9.7) ; mesurer aux premières sorties | T4.1 + Oscar |
| 7 | **Proxy egress** bloque IGN en conteneur | Aucune validation carto par agent | Tout `[MACHINE LOCALE]`, preuve = capture de preview | tous |
| 8 | Deploy Railway **silencieusement FAILED** | Oscar teste une vieille version sur le terrain | `railway deployment list` → `SUCCESS` obligatoire à chaque annonce | T0.1, T4.2 |
| 9 | **Cache du service worker** collé sur une vieille version | PWA figée sur le téléphone, sans message | En-têtes du §5.3 + stratégie de mise à jour explicite | T0.1, T1.2 |
| 10 | Repo public listant des cibles | Ratissage par des tiers avant toi | `data/private/` gitignoré | acté §1 |
| 11 | **iOS purge IndexedDB** d'une PWA inutilisée | Perte de données — **largement résorbé** par la sync Postgres | Sync (T1.7) en réponse principale ; export auto + détection de base vide en filet (§5.5) | T1.7 + T1.5 |
| 11b | **Fenêtre non synchronisée** : sortie entière hors réseau, puis téléphone cassé/noyé | La sortie n'existait que sur le téléphone → perdue | L'export auto de fin de session reste nécessaire malgré la sync | T1.5 |
| 16 | **RLS absente ou permissive** sur Supabase | La clé anon étant publique, trouvailles lisibles et modifiables par n'importe qui — **le seul vrai risque de sécu du projet** | RLS dès la migration initiale, test depuis une session anonyme | T1.7 |
| 17 | **Pause Supabase** après 7 jours d'inactivité (usage saisonnier) | Projet injoignable au retour, **aucune donnée perdue**, réveil ~30 s | Cron GitHub Actions hebdomadaire de ping | T1.7 |
| 18 | **Divergence des schémas** Dexie / Supabase | Bug de sync silencieux, champ perdu sans erreur | Les deux dérivent du même `CONTRACTS.md`, test de conformité en CI | T0.2, T1.7 |
| 19 | **Clé `service_role` dans le dépôt** | Contourne RLS, ouvre tout | Scan de secrets en CI ; elle ne quitte jamais le poste d'Oscar | T0.1 |
| 12 | **Décalage de projection** (Lambert-93 vs Web Mercator) non détecté | Couches superposées à quelques dizaines de mètres à côté, sans que ça se voie | Reprojection exclusivement dans `tools/prep/`, EPSG écrits dans `CONTRACTS.md` | T0.2, T3.1 |
| 13 | **Précision GPS 3-10 m** | Un trou n'est pas re-localisable ; les `DigPoint` ne valent qu'en densité | `accuracyM` affiché en continu ; photo avec repère fixe (§9.6) | T1.3 |
| 14 | Artefacts lourds dans git | Repo public inclonable | **GitHub Releases**, ni LFS ni dépôt (§5.6) | T3.1 |
| 15 | Surinterprétation des microtoponymes anthroponymiques | Faux positifs en masse dans le scoring | Avertissement Polge, filtrage des noms de famille | T2.3, T2.4 |

---

## 11. Backlog v2+ (hors périmètre, à ne pas commencer)

- **Calibration du scoring par les trouvailles** : chaque `Find` et chaque `DigPoint` d'`outcome: 'rien'` réajuste les pondérations. Les négatifs comptent autant que les positifs — c'est ce qui rend le modèle honnête plutôt que flatteur. Nécessite ~une saison de données.
- **Table de lecture des signaux ACE 250** : croiser `DetectorSignal` et objets réellement sortis pour construire la correspondance segment → nature de cible, propre à cette machine et à ce sol. Aucun forum ne peut la fournir.
- **Évaluation des presets** : le `presetId` est enregistré dès la v1, donc dès qu'il y a du volume on peut comparer le rendement par preset et corriger les fourchettes du §9.8 sur données réelles au lieu de mes hypothèses.
- Synchronisation multi-appareils (Postgres sur Railway) si prospection à plusieurs.
- Détection semi-automatique d'anomalies LiDAR (segmentation d'enclos et de plateformes).
- Extension à d'autres zones — l'architecture le permet déjà via `config/zone.json`.
- Extraction d'un package réutilisable (superposition de cartes anciennes IGN) → à arbitrer contre `MODULES_CATALOG.md`, et **seulement** en dépendance versionnée, jamais en copie.

---

## 12. Questions — état

**Tranchées le 2026-08-08** : forme de l'app (web app Railway), usage du téléphone (en main → pas de natif), détecteur (Garrett ACE 250 → §6, §9.7), pondérations du scoring (déléguées à moi, je les assume et les révise sur données réelles).

**Reste ouvert, non bloquant** :
0. **Sais-tu qui exploite les parcelles visées ?** (§4.4) Pas pour une question d'autorisation — c'est ton sujet — mais parce que l'agriculteur qui laboure sait où la tuile remonte. C'est la source la moins chère du projet et la seule que je ne peux pas dépouiller à ta place.
1. **Solo ou à plusieurs ?** Conditionne la synchro multi-appareils, aujourd'hui en v2. Rien à décider avant que la v1 tourne.
2. **Deux valeurs à calibrer sur le terrain, pas depuis un bureau** — et je les redemanderai après tes premières sorties, avec les traces sous les yeux :
   - le seuil de vitesse `ratisse` / `passage_rapide` (§6.1, posé à 0,45 m/s par hypothèse) ;
   - la largeur d'arc de balayage réelle, qui dépend de ton geste et pas d'une spec.

---

## 13. Ordre d'exécution, dépendances et fin de v1

Manquait à la première version : le plan listait des lots sans dire **qui attend quoi**, ni **à quoi on reconnaît que c'est fini**.

### 13.1 Graphe de dépendances

```
T0.1 scaffold ──┬─> T0.2 contrat (BLOQUANT pour tout le code)
                │
                ├─> T1.1 cartes ─────────┐
                ├─> T1.2 tuiles offline ─┤
                ├─> T1.3 GPS ────────────┤
                ├─> T1.4 trouvailles ────┼─> T4.2 integration-check ─> v1
                ├─> T1.5 sauvegarde ─────┤
                ├─> T1.6 fenêtre sortie ─┤
                └─> T1.7 Supabase + sync ┘

T2.1 histoire ─┐
T2.2 sources ──┼─> T2.4 dépouillement CAG/BSAG ─┐
T2.3 toponymie ┘                                 │
                                                 ├─> T3.2 grille ─> T3.3 moteur ─┬─> T3.5 presets
T2.2 ─> T3.1 pipeline données [MACHINE LOCALE] ──┘                               └─> T3.4 zones
                                                                                      │
                                                        T4.1 méthode ─> T4.2 ─────────┘
```

Phases 1 et 2 tournent **en parallèle** : la phase 2 ne produit que des documents, aucun conflit de fichiers avec le code. Seule vraie barrière du plan : **T0.2**.

### 13.2 Ce qu'il faut d'Oscar, et quand

| Moment | Ce qui est attendu de lui | Bloque |
|---|---|---|
| Avant T1.1 | Identifiant WMTS Cassini (GetCapabilities depuis son poste) | T1.1 |
| Avant T3.1 | Couverture LiDAR HD du Gers vérifiée | tout le rang C du scoring |
| Avant T3.1 | Plans du cadastre napoléonien d'Armous-et-Cau récupérés (AD32) | le meilleur prédicteur |
| Après T0.1 | Installation de la PWA sur son téléphone, retour de lisibilité au soleil | T1.3, T3.5 |
| Après 1ʳᵉ sortie | Traces réelles → calibration du seuil `ratisse` et des fourchettes de sensibilité | §6.1, §9.8 |

### 13.3 Definition of Done — v1

La v1 est finie quand **toutes** ces lignes sont vraies, chacune avec sa preuve :

1. `typecheck`, `lint`, `build`, Vitest, Playwright — verts, **sorties brutes lues**.
2. `railway deployment list` → **`SUCCESS`**, PWA installée sur le téléphone d'Oscar depuis l'URL.
3. Les **4 fonds historiques** (Cassini, état-major, ortho actuelle, ortho 1950-65) se superposent et se comparent au rideau — capture à l'appui.
4. **Mode avion** : la zone reste navigable de z12 à z18.
5. Une session complète tourne de bout en bout : trace → bandes ratissées → creusage → trouvaille → photo → observation de surface → export → réimport, **sans perte**.
6. Effacer la base locale puis relancer → l'app **propose la restauration** (§5.5).
6b. **Sync éprouvée** : session complète en mode avion, retour du réseau, **tout remonte sans doublon** ; rejouer la file deux fois ne crée rien ; coupure au milieu d'un lot → reprise propre. **Depuis une session anonyme, aucune table n'est lisible** — testé.
7. La couche de score s'affiche et **chaque cellule chaude s'explique** dans son panneau.
8. Le preset de réglage s'affiche à l'entrée d'une cellule et est **lisible bras tendu au soleil**.
9. `docs/zone/CIBLES.md` contient au moins **une localisation argumentée** pour Armous et une pour Cau, sourcée.
10. Verdict **go** écrit par T4.2.

Le critère qui prime sur tous les autres, et qui ne se teste qu'en marchant : **une sortie de trois heures se log sans que ce soit pénible**. Si enregistrer un creusage prend plus de 5 secondes avec des gants, rien ne sera enregistré, et tout l'édifice de calibration v2 s'écroule.

### 13.4 Charge estimée

[HYPOTHÈSE] — je n'ai pas d'historique de vélocité sur ce type de projet, donc ces ordres de grandeur sont à prendre comme tels, pas comme un engagement.

| Phase | Lots | Ordre de grandeur |
|---|---|---|
| 0 — fondations | 2 | court, mais **T0.2 ne se bâcle pas** : tout le reste en dépend |
| 1 — terrain | 7 | le gros du code ; T1.2 (offline) et T1.5 (sauvegarde) sont les plus piégeux |
| 2 — historique | 4 | dépend surtout de l'accès aux archives, pas des agents. **T2.4 est le meilleur rapport effort/résultat du plan.** |
| 3 — données et scoring | 5 | T3.1 domine, et une grande partie est du travail manuel de calage `[MACHINE LOCALE]` |
| 4 — méthode et intégration | 2 | court, mais T4.2 a droit de veto |

**Le chemin le plus court vers une première sortie utile** ne passe pas par la v1 complète : T0.1 + T0.2 + T1.1 + T1.3 + T1.4 + T1.5 donnent déjà un outil de terrain exploitable, avec `CIBLES.md` de T2.4 comme cerveau provisoire. Le scoring automatique peut suivre.
