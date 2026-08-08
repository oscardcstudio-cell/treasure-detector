# Méthode de terrain — Protocole opérationnel pour sorties

Ce document est ton check-list de sortie et ton référent terrain. À relire la veille, à consulter sur le terrain avec des gants. Tone : direct, deuxième personne, scannable en 2 minutes.

---

## 1. Avant la sortie — 1 h de préparation

### 1.1 Choisir la cible (15 min)

Ouvre `docs/zone/CIBLES.md`. Cherche les cibles avec statut **[FAIT]** et confiance **HAUTE** ou **MOYENNE** :
- **Groupe A (majeurs)** : Noyau Armous (43.56254 / 0.17489), Motte Lamothe (43.55358 / 0.19112), Voie Caussade (43.5832 / 0.1842), Source Hountan (43.5719 / 0.2029)
- Nouvelle découverte depuis 2026-08-08 : **Moulin de Floures** (limite sud, planche cadastre /8) + **église directe** (planche « 2ème feuille », coordonnées à caler)

Ignore les cibles [HYPOTHÈSE] en solo — ce sont des pistes pour la saison 2.

**La première sortie** : Noyau d'Armous + Motte Lamothe (même sector, cibles n°1 et n°3 du projet). Tu vérifieras sur le terrain si le scoring vise juste sans creuser un seul trou.

### 1.2 Vérifier la fenêtre (20 min)

**Conditions optimales** (PLAN §9.3) :
- Après labour, après une pluie — sol tassé, objets remontés, bonne conductivité
- Pas de sol gelé ou très sec
- Chaume après moisson : bon compromis d'accès

Consulte :
- Météo : pluie ? Sols gorgés ? Pluie prévue en début de sortie ? (attendre)
- État des parcelles (satellite IGN, ou demande direct à l'agriculteur) : labouré ? Semé ? Récolté ?
- Fenêtre saisonnière : sortie post-labour urgente, ou tu peux attendre le mois prochain ?

Si sol trop sec ou gelé → reprogrammer. C'est là que 3 h de recherche avant 1 h de terrain paye (PLAN §9.0).

### 1.3 Équipement physique — checklist

- **Détecteur** : Garrett ACE 250 + batterie neuve, batteries de rechange (9V)
- **Casque** : obligatoire (les vrais signaux sont faibles et râpeux, inaudibles au HP du champ) — charge-le la veille
- **Disque sniper 4,5"** : dans le sac (pour le cœur de village saturé de ferraille)
- **Bêchette / carotte** : propre, marquée au nom
- **Gants** : travail + paires de rechange
- **Pochettes** : 2-3 petit zip (monnaies/objets fragiles séparés du fer)
- **Crayon** : noter segment/mode/profondeur sur la pochette
- **Photo** : smartphone avec batterie, ou appareil photo dédié
- **GPS du téléphone** : à jour, application prête (offline si possible)
- **Lunettes de soleil** : lisibilité écran + yeux
- **Trousse de premier secours** : ampoules, tétanos à jour (PLAN §9.9)

### 1.4 Télécharger la zone hors ligne

Depuis l'app :
- Télécharge la zone autour de la cible (z12–z18, PMTiles locales ou cache de la PWA)
- Marque les cibles dans le GPS ou dans l'app (épingle)
- Teste le mode avion sur 10 min : la carte reste navigable ?

Depuis le terrain, tu n'auras pas de réseau. L'app est ton cerveau une fois dehors.

---

## 2. Séquence type d'une sortie de 3 h

### 2.1 Phase 1 — Prospection pédestre de surface (45 min)

**Avant de sortir le détecteur, on marche le champ en regardant par terre** (CERAMES, ArchéoTours, PLAN §9.2). C'est ta boucle de validation la moins chère : tu dis si le scoring vise juste *sans creuser un seul trou*.

**Protocole** :
1. Marche des **lignes parallèles espacées de 20 à 25 m** (mesure au pas : ~30 pas)
2. Balayage lent, yeux baissés, en V (voir ce qui remonte du labour)
3. **Quoi ramasser / photographier** (PLAN §9.2) :
   - **Tegulae** (tuiles plates à rebord) + **imbrices** → site gallo-romain probable
   - **Sigillée** (céramique fine rouge, brillante) → habitat romain sûr
   - **Céramique grise** + **mortier** + **moellons épars** → habitat médiéval
   - Monnaies (toute couleur, toute époque, même cassées) → noter la position au pas
   - Clous forgés, ferrures → noter les concentrations (c'est le plan du bâtiment, PLAN §9.7)
4. **Zones de densité** : quand tu trouves 3-4 tegulae ou équivalent dans un carré de 15×15 m, c'est un signal — l'app t'affichera si c'est une zone chaude
5. Photographe chaque groupe d'objets *in situ* avant de le ramasser (les positions importent)

**Sortie de cette phase** : liste des zones chaudes confirmées (ou infirmées) visuellement. Si rien en surface malgré un score A → site probablement enfoui profond, terrain délicieux pour le détecteur. Si beaucoup de tuile → villa gallo-romaine classique, beaucoup de petit fer → cœur de village.

### 2.2 Phase 2 — Quadrillage au détecteur (120 min)

Maintenant tu rentres le détecteur.

**Réglages de départ** (voir tableau §3 pour détails) :

Tu arrives dans un **cœur de village déserté** ? Applique ce preset :
```
Mode        : All-Metal (ne pas discriminer le fer — c'est ton plan du bâtiment)
Sensibilité : 6-7 (redescends à 4-5 si ça bavarde)
Disque      : sniper 4,5" si ferraille dense, sinon 6,5"×9" stock
Balayage    : très lent, disque au ras, fort chevauchement 50 %
Creusage    : creuse tout signal répétable, même faible et râpeux
```

**Structuration du quadrillage** (PLAN §6.1, §9.8) :
1. Divise ton secteur en bandes parallèles (largeur = 2× portée du disque, ~3 m)
2. **1ʳᵉ passe** : bande 1, bande 2, etc., d'ouest en est
3. **2ᵉ passe** : perpendiculaire (nord–sud) — tu touches les cibles que la 1ʳᵉ a ratées selon la profondeur/orientation
4. **3ᵉ passe** (si temps) : 45° — surplus de sécurité
5. L'app affiche les bandes couvertes en continu — elle te dit quand tu peux arrêter

**Vitesse** : 1 bande en ~20 min (sens à la machine, écoute, geste ample = efficacité). Les apéros et les discussions ralentissent tout. Si tu es dans les labours frais après pluie, tu peux accélérer (PLAN §9.8 « Labour frais »).

---

## 3. À chaque signal / creusage (durée : < 5 min par trou)

### 3.1 Reconnaissance du signal

**Tu as un blip au détecteur. Procédure** :

1. **Rescan lent du même point** : même angle (note le segment affiché sur l'ACE 250, 1–12)
2. **Rescan perpendiculaire** : tourne 90°, refais passer le disque — le signal change-t-il ? (signet de profondeur et d'orientation, PLAN §9.7)
3. **Verdict** : 
   - Signal net et fort au cœur d'un village déserté ? Probablement modern (canette, fil barbelé)
   - Signal faible, râpeux mais **répétable** ? Creuse (c'est de l'ancien)
   - Rien au rescan ? Faux signal, passe

### 3.2 Creusage — geste propre

Tu creuses. **Technique** :
- **Carotte** (bêchette / sonde) : enfonce perpendiculairement, retire un cylindre de terre
- **Passage du disque** dans le trou : signal disparaît ? L'objet est dans l'extractum
- **Récupération** : à la main, ou resonde si profond
- **Motte** : retourne-la au-dessus du trou, puis remets-la à sa place (PLAN §9.7)
- **Aucun trou laissé ouvert** — un champ rendu propre est un champ où tu peux revenir

### 3.3 Enregistrement objet (< 5 sec avec gants)

**Dans l'app, saisis** :
- **Localisation** : le GPS auto-note ta position (`accuracyM` affiché = confiance du GPS, 3–10 m)
- **Profondeur** : indiquée par la machine (jusqu'à 8 pouces / ~20 cm), ou estim au doigt (0–5 cm, 5–15 cm)
- **Outcome** : 
  - `found` (objet récupéré)
  - `ferraille` (scrap metal, clous, chaînes — surtout ne pas laisser vide, c'est le plan du bâtiment)
  - `nothing` (faux signal)
- **Description courte** : ex. « monnaie billon gris », « clou 10 cm », « canette »
- **DetectorSignal** (optionnel, mais précieux pour calibrage v2) :
  - Segment 1–12 (lis sur l'écran ACE 250)
  - Mode (All-Metal)
  - Sensibilité (6 ou 7)
  - Répétabilité (oui/non)

### 3.4 Photo in situ

**Avant d'extraire**, photographie l'objet dans le trou ou juste au-dessus (PLAN §9.6) :
- Contexte visible : sol, repère fixe (arbre, poteau, angle de parcelle) pour relocaliser au besoin
- La photo + la position GPS remplacent l'essai de retrouver le trou précis un mois plus tard

### 3.5 Monnaies et objets fragiles

Glisse-les dans une **pochette zip**, note au crayon : segment, profondeur, date sortie. Ne les laisse pas à l'air — humidité va les oxyder.

**Le fer, c'est le plan du bâtiment** (PLAN §9.7) : concentrations de clous forgés dessinent l'emprise des murs. Prends des photos, note les concentrations, ne vide pas en fin de journée.

---

## 4. Après la sortie — 20 min

### 4.1 Vérifier la sync

Revenu au réseau (ou en arrivant à la maison) :
- L'app affiche une **badge sync** (petit icône) — c'est bon signe
- Ouvre l'app sans la forcer : elle remonte les `DigPoint` vers Supabase automatiquement
- Attends ~1 min — aucun message d'erreur ? Sync OK

**Si pas de sync** : vérifie le réseau, redémarre l'app une fois, puis contacte.

### 4.2 Export auto des données

Fin de session, l'app propose un **export automatique** (CSV ou JSON) de tout ce qui a été loggé. Accepte. Tu l'auras aussi sur Supabase, mais l'export local est ta police d'assurance.

### 4.3 Calibrage — notes pour la sortie suivante

Prends 2 min pour noter dans un carnet ou l'app :

**État du sol** : sec ? gorgé ? compact ? Tas de cailloux ? Ces notes servaient à ajuster la sensibilité en v2.

**Sensibilité observée** : As-tu dû redescendre à 4-5 parce que ça bavardait ? Ou 6-7 a suffi ? (PLAN §9.8, valeurs [HYPOTHÈSE] à calibrer sur ce sol)

**Largeur d'arc réelle** : à 50 % chevauchement, tes bandes font combien de mètres de large ? (tu peux mesurer au pas) — c'est aussi [HYPOTHÈSE] à affiner.

**Ratio signal/objet** : combien de faux signaux sur combien de vrais ? Ce ratio change par type de site (cœur dense = beaucoup de ferraille, voie dégagée = peu).

Ces notes alimenteront la calibration v2 et les presets futurs.

---

## 5. Tableau de presets par type de site

Extrait direct du PLAN §9.8, à consulter si tu changes de secteur en cours de sortie.

| Profil de site | Mode | Sensibilité | Disque | Balayage | Creusage | Attendu |
|---|---|---|---|---|---|---|
| **Cœur village / église** (Armous, Cau) | All-Metal | 6-7 → 4-5 si ça bavarde | sniper 4,5" | très lent, fort chevauchement | **tout signal répétable** | billon, boucles, plombs, clous |
| **Villa gallo-romaine, champ** | All-Metal | 7-8 | stock 6,5"×9" | normal | signaux médians répétables | bronzes, fibules, tuile surface |
| **Voie ancienne** | All-Metal | 6-7 | stock | transects le long ET en travers de l'axe | tout | monnaies isolées, ferrures |
| **Moulin, bief, bord ruisseau** | All-Metal | 5-6 | sniper si ferraille dense | lent | trier ferraille mécanisme | fer massif, plomb, monnaies |
| **Prairie permanente** | All-Metal | 7-8 | stock | très lent, écoute du faible | signaux profonds faibles | cibles profondes, non remontées |
| **Labour frais après pluie** | All-Metal | 7 | stock | normal | rendement maximal | tout — meilleures conditions |
| **Sol argileux détrempé** | All-Metal | 4-5 | stock | lent | ignorer ID instable, répétabilité | régime de faux signaux |
| **Bois** | All-Metal | 6-7 | sniper | lent, entre racines | tout | LiDAR préféré |

---

## 6. Sécurité

**Avant chaque sortie** :
- Tétanos à jour (risque de rouille dans les vieux objets) — mets à jour si doute
- Gants : obligatoires (protègent contre tétanos + coupures sur tuile cassée)
- Eau, téléphone chargé
- Trajet connu ou quelqu'un au courant du secteur

**À la trouvaille** :
- **Munitions / engins non explosés** : très rare dans le Gers, mais certains dépôts existent. Ne **jamais** manipuler → appelle les pompiers
- **Plomb** : petit objet n'est pas dangereux en manipulation brève, mais lave-toi les mains après (plomb en poudre dans la terre)
- **Objets tranchants** : tuile cassée, métal rouillé → gants épais, pas de mains nues

---

## 7. Deux valeurs [HYPOTHÈSE] à calibrer sur ce sol

Le PLAN §9 dit clairement : ces chiffres sont ma synthèse de docs et forums, **pas des mesures sur ton sol Armousien**.

### 7.1 Seuil de vitesse `ratisse` / `passage_rapide` (PLAN §6.1, §13)

Posé à **0,45 m/s** par hypothèse. Il divise tes traces en « ratissage » (couverture efficace) et « passage » (transit).

**À mesurer** : première sortie, tu notes les traces GPS (que tu as en export). Une bande ratissée fait combien de m/s effective (distance / durée) ? Compare à 0,45. Trop bas ? Relève. Trop haut ? Baisse.

### 7.2 Largeur d'arc réelle du balayage

Dépend de **ton geste et pas d'une spec**. À 50 % chevauchement, tes bandes de 3 m doivent se chevaucher pour pas de trou. *Mais quelle est ta vraie portée disque sur ce sol ?*

**À mesurer** : trace un quadrillage papier avant de commencer, recale après. L'écart disque-sol (hauteur geste) affecte tout.

Ces deux mesures s'affineront après chaque sortie en regard des `DigPoint` réels et de l'export de traces GPS.

---

## Correspondance avec PLAN.md

- **§9.0** (recherche amont) → §1.1, §1.2
- **§9.2** (prospection pédestre) → §2.1
- **§9.3** (conditions) → §1.2
- **§9.7** (ACE 250) → §3.1, §3.2, §5
- **§9.8** (presets) → §5
- **§9.9** (sécurité) → §6
- Profondeur/fer/GPS/enregistrement → §3.3, §3.4, §3.5
- Calibrage [HYPOTHÈSE] → §4.3, §7

---

## Notes pour Oscar

Ce document couvre la méthode standard de terrain (marche avant détecteur, quadrillage, enregistrement rapide, presets). Il ne remplace pas le jugement sur le terrain ni la curiosité — si tu trouves un pattern inattendu (beaucoup de monnaies d'une époque, absence de fer dans un secteur), c'est une piste pour la sortie suivante.

La première sortie validera si le scoring vise juste. La deuxième sortie commencera à calibrer les deux [HYPOTHÈSE] ci-dessus. À partir de la troisième, l'app deviendra ton outil de prospection pensant, pas un carnets numérique.

**À vérifier après 1ʳᵉ sortie** : évidemment, ce protocole est fourni par quelqu'un qui n'a jamais détecté à Armous-et-Cau. Corrige sans attendre ce qui ne fait pas sens sur ce sol.
