# Décisions & blocages — treasure-detector

> Mis à jour le 2026-08-08. Décisions figées (§1 du plan) + ce qui attend une action d'Oscar (§12, §13.2).

## Décisions figées (non rediscutables — §1 du plan)

| Sujet | Décision |
|---|---|
| Nom | `treasure-detector` |
| Visibilité | Repo **public**, objectif de prospection assumé |
| Zone pilote | Armous-et-Cau (32) + environnement immédiat — **paramètre** `config/zone.json` |
| Prédiction | **Scoring heuristique transparent**, pondérations éditables, explicable cellule par cellule (pas de ML boîte noire) |
| Cadre réglementaire / autorisations | **Hors périmètre.** Aucun agent ne produit de dossier d'autorisation ni de garde-fou de conformité. Oscar gère où il va |
| Stack | PWA local-first + Railway (hébergement) + Supabase (données, photos) |
| Forme | **Web app**, pas d'emballage natif (ni v1 ni v2) |
| Usage terrain | Téléphone en main, carte ouverte → tracé GPS en avant-plan suffit |
| Détecteur | **Garrett ACE 250** — 6,5 kHz, disque 6,5"×9", échelle 12 segments, sans ground balance. Contraint le contrat de données (§6) et les presets (§9.8) |
| Pondérations scoring | Déléguées à l'agent, en JSON éditable, révisées après les 1res sorties sur `DigPoint` réels |

## Ce qui attend Oscar (§13.2) — bloquants

| Moment | Attendu de lui | Bloque |
|---|---|---|
| Après T0.1 | Installer la PWA sur son téléphone, retour de lisibilité au soleil | T1.3, T3.5 |
| Après 1re sortie | Traces réelles → calibrer seuil `ratisse`/`passage_rapide` (0,45 m/s [HYPOTHÈSE]) et fourchettes de sensibilité | §6.1, §9.8 |

### Cadastre napoléonien d'Armous-et-Cau — [FAIT] en ligne (vérifié 2026-08-08)

Portail AD32 : archives32.fr → Fonds numérisés → « Recherche de plans cadastraux napoléoniens » (`FondsNumerises/index.php?type=2`, sélectionner ARMOUS-ET-CAU). **9 planches numérisées, consultables en visionneuse zoomable** (`zoom_n.php`), cote **3P**, géomètres nommés :
- `3P_..._1` : tableau d'assemblage, 1/10000, 1813 (Daubas)
- `3P_..._7` + `_8` : **section C1/C2 « dite d'Armous », 1/2500, 1813** — nomme et localise directement le vieux village d'Armous (cible n°1 ; on y lit un « Bourg »)
- `_2/_3/_4` : section A « de Barroles » · `_5/_6` : section B « de Rozes » (1819) · `_9` : section D « de Mauran »
- **Piste ouverte** : aucune section « de Cau ». Le noyau de Cau n'est pas une section cadastrale → à croiser (dans une autre section, ou en limite de commune). Reste le point dur de la localisation.
Reste vrai (§4.4) : plans **non géoréférencés** → calage manuel dans T3.1 (le prix d'entrée du meilleur prédicteur). Consultation en visionneuse ; export pleine résolution à confirmer au moment du calage.

Notes — bloquants levés :
- Identifiant WMTS Cassini (ancien bloquant de T1.1) — confirmé par le spike (`prototype/FINDINGS.md`).
- **Couverture LiDAR HD d'Armous-et-Cau** (ancien bloquant du rang C du scoring) — **levé le 2026-08-08** : commune en bleu sur la carte de dispo IGN (https://geoservices.ign.fr/lidarhd) = « nuages et modèles numériques disponibles » (nuages de points + MNT/MNS téléchargeables). Rang C du scoring débloqué.

## Questions ouvertes non bloquantes (§12)

0. **Qui exploite les parcelles visées ?** L'agriculteur qui laboure sait où la tuile remonte — la source la moins chère du projet (§4.4). Rien à décider, juste une piste terrain.
1. **Solo ou à plusieurs ?** Conditionne la synchro multi-appareils (aujourd'hui en v2). Rien à trancher avant que la v1 tourne.
2. Deux valeurs qui ne se calibrent que sur le terrain (seuil de vitesse, largeur d'arc de balayage réelle) — à redemander après les 1res sorties.
