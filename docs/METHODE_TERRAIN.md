# Méthode de terrain — Protocole opérationnel pour sorties

Ce document est ton check-list de sortie et ton référent terrain. À relire la veille, à consulter sur le terrain avec des gants.

---

## 1. Avant la sortie — 1 h de préparation

### 1.1 Choisir la cible (15 min)

Ouvre `docs/zone/CIBLES.md` et cherche les cibles avec statut **[FAIT]** et confiance **HAUTE** ou **MOYENNE** :

**Groupe A (majeurs)** : Noyau Armous (43.56254 / 0.17489), Motte Lamothe (43.55358 / 0.19112), Voie Caussade (43.5832 / 0.1842), Source Hountan (43.5719 / 0.2029). Découvertes récentes (2026-08-08) : **Moulin de Floures** (limite sud, planche cadastre /8) + **église directe** (coordonnées à caler).

Oublie les cibles [HYPOTHÈSE] en solo — saison 2.

**Première sortie** : Noyau Armous + Motte Lamothe (même secteur, cibles 1 et 3). Tu vérifies si le scoring vise juste *sans creuser un trou*.

### 1.2 Vérifier la fenêtre (20 min)

**Conditions optimales** (PLAN §9.3) : après labour + pluie (sol tassé, objets remontés, bonne conductivité) · pas de sol gelé ou très sec · chaume après moisson (bon compromis d'accès).

Consulte météo (pluie, sols gorgés ?) · état des parcelles sur IGN ou directement auprès de l'agriculteur (labouré ? semé ? récolté ?) · fenêtre saisonnière (urgent post-labour, ou tu peux attendre ?).

Sol trop sec ou gelé ? Reprogramme. C'est là que 3 h de préparation avant 1 h de terrain paye (PLAN §9.0).

### 1.3 Équipement — checklist rapide

Détecteur (ACE 250 + batterie neuve + rechanges 9V) · casque chargé (obligatoire : les vrais signaux sont faibles) · disque sniper 4,5" · bêchette/carotte propre marquée · gants + paires de rechange · pochettes zip (monnaies/fragiles séparées du fer) · crayon pour les pochettes · smartphone chargé + app offline prête · lunettes · trousse premier secours (tétanos à jour).

### 1.4 Télécharger la zone hors ligne

Depuis l'app : zone z12–z18 autour de la cible · marque les cibles (épingle) · teste mode avion 10 min — la carte reste navigable ?

Sur le terrain, pas de réseau. L'app est ton cerveau une fois dehors.

---

## 2. Séquence type d'une sortie de 3 h

### 2.1 Phase 1 — Prospection pédestre de surface (45 min)

**Avant le détecteur, marche le champ yeux baissés** (CERAMES, PLAN §9.2). Validation la moins chère : tu dis si le scoring vise juste *sans creuser*.

Marche lignes parallèles espacées 20–25 m (~30 pas) · lent, balayage en V (voir ce qui remonte du labour) · ramasse et photographie *in situ* :
- **Tegulae + imbrices** → gallo-romain probable
- **Sigillée** (rouge brillante) → habitat romain sûr
- **Céramique grise + mortier + moellons** → médiéval
- **Monnaies** (toute époque, même cassées) → noter position
- **Clous forgés, ferrures** → noter les concentrations (c'est le plan du bâtiment, PLAN §9.7)

Densité = signal : 3–4 tegulae dans un carré 15×15 m = zone chaude.

**Résultat** : zones confirmées/infirmées visuellement. Rien en surface malgré score A ? Site enfoui profond. Beaucoup de tuile ? Villa gallo-romaine. Beaucoup de petit fer ? Cœur de village.

### 2.2 Phase 2 — Quadrillage au détecteur (120 min)

**Cœur de village déserté** → Mode All-Metal · sensibilité 6–7 (baisse à 4–5 si ça bavarde) · disque sniper 4,5" si ferraille dense, sinon stock 6,5"×9" · balayage très lent, fort chevauchement 50 %, creuse tout signal répétable.

Quadrillage systématique : bandes parallèles ~3 m (2× portée disque) · 1ʳᵉ passe ouest–est, 2ᵉ passe nord–sud (tu attrapes les cibles ratées selon profondeur/orientation), 3ᵉ passe 45° si temps (surplus de sécurité). L'app affiche couverture en direct — elle te dit quand arrêter.

Vitesse : 1 bande en ~20 min. Les apéros ralentissent tout. Labours frais après pluie ? Accélère (PLAN §9.8).

---

## 3. À chaque signal / creusage (< 5 min par trou)

**Signal** → rescan lent angle identique (note segment ACE 250, 1–12) · rescan perpendiculaire 90° (signal change ? oui = profondeur/orientation) · verdict : net et fort en village = modern (canette, fil) · faible, râpeux, *répétable* = creuse (ancien) · rien au rescan = faux signal.

**Creusage** : carotte perpendiculaire, cylindre de terre · passe disque dans le trou (signal disparaît = objet dedans) · motte retournée au-dessus du trou, remise en place · **zéro trou ouvert** (champ propre = tu peux revenir).

**Enregistrement app** (< 5 sec gants) : GPS auto (accuracyM 3–10 m) · profondeur machine ou doigt (0–5 cm / 5–15 cm) · outcome = `found` / `ferraille` / `nothing` · description courte · **DetectorSignal** optionnel pour v2 = segment (1–12), Mode (All-Metal), sensibilité (6 ou 7), répétabilité (oui/non).

**Photo in situ** : avant d'extraire, contexte visible (sol, repère fixe arbre/poteau/angle parcelle). Photo + GPS = tu localises le mois prochain.

**Monnaies et fragiles** : pochette zip, note au crayon (segment, profondeur, date). Pas à l'air (humidité oxyde).

**Le fer = plan du bâtiment** (PLAN §9.7) : concentrations de clous forgés = emprise des murs. Photos, notes, ne vide pas en fin de journée.

---

## 4. Après la sortie — 20 min

Au réseau : app sync auto vers Supabase (badge sync visible, ~1 min). Pas de sync ? Vérifie réseau, redémarre app une fois.

Export auto (CSV/JSON) : accepte. Tu l'as aussi sur Supabase, mais l'export local est ton assurance.

Calibrage rapide (2 min) pour la sortie suivante : **État du sol** (sec ? gorgé ? compact ? cailloux ?) · **Sensibilité observée** (dû baisser à 4–5 ? Ou 6–7 a suffi ?) · **Largeur arc réelle** (bandes larges de combien en mètres à 50 % chevauchement ?) · **Ratio signal/objet** (faux/vrais ?). Ces notes affinent v2 et futurs presets (PLAN §9.8, [HYPOTHÈSE] à calibrer sur ton sol).

---

## 5. Presets par type de site

À consulter si tu changes de secteur (PLAN §9.8).

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

Avant : tétanos à jour · gants obligatoires (tétanos + coupures) · eau, téléphone chargé · quelqu'un au courant du secteur.

Trouvailles : munitions/engins non explosés (rare dans le Gers, mais existe) → **jamais** manipuler, appelle pompiers · plomb (petit objet = OK manipulation brève, lave mains après) · objets tranchants (tuile cassée, métal rouillé) → gants épais.

---

## 7. Deux [HYPOTHÈSE] à calibrer sur ce sol

Ces chiffres sont synthèse docs/forums, **pas tes mesures Armousienne** (PLAN §9).

**Seuil de vitesse** (PLAN §6.1) : 0,45 m/s divise traces en « ratissage » (efficace) vs « passage » (transit). À mesurer : export GPS, une bande ratissée = combien de m/s réelle ? Trop bas ? Relève. Trop haut ? Baisse.

**Largeur d'arc réelle** : dépend de ton geste, pas d'une spec. À 50 % chevauchement, tes bandes 3 m chevaucheront selon ta vraie portée disque. À mesurer : quadrillage papier avant, recalage après (écart disque-sol affecte tout).

Affinage après chaque sortie vs `DigPoint` réels + GPS export.

---

## Correspondance avec PLAN.md

§9.0 (amont) → 1.1, 1.2 · §9.2 (pédestre) → 2.1 · §9.3 (conditions) → 1.2 · §9.7 (ACE 250) → 3 · §9.8 (presets) → 5 · §9.9 (sécu) → 6 · calibrage [HYPOTHÈSE] → 4, 7

---

## À retenir

Ce protocole (marche avant détecteur, quadrillage, enregistrement, presets) ne remplace pas le jugement terrain ni la curiosité. Pattern inattendu (beaucoup de monnaies d'une époque, absence de fer) ? Piste pour la sortie suivante.

Sortie 1 : valide si scoring vise juste · Sortie 2 : commence à calibrer les deux [HYPOTHÈSE] · Sortie 3+ : l'app devient ton outil pensant.

**À vérifier après 1ʳᵉ sortie** : ce protocole vient de quelqu'un qui n'a jamais détecté à Armous-et-Cau. Corrige sans attendre ce qui ne fait pas sens sur ce sol.
