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
| Avant T3.1 | **Couverture LiDAR HD du Gers** confirmée (carte IGN, commune en bleu = à confirmer) | tout le rang C du scoring |
| Avant T3.1 | Plans du **cadastre napoléonien** d'Armous-et-Cau récupérés (AD32) | le meilleur prédicteur du projet |
| Après T0.1 | Installer la PWA sur son téléphone, retour de lisibilité au soleil | T1.3, T3.5 |
| Après 1re sortie | Traces réelles → calibrer seuil `ratisse`/`passage_rapide` (0,45 m/s [HYPOTHÈSE]) et fourchettes de sensibilité | §6.1, §9.8 |

Note : l'identifiant WMTS Cassini (ancien bloquant de T1.1) est **levé** — confirmé par le spike (`prototype/FINDINGS.md`).

## Questions ouvertes non bloquantes (§12)

0. **Qui exploite les parcelles visées ?** L'agriculteur qui laboure sait où la tuile remonte — la source la moins chère du projet (§4.4). Rien à décider, juste une piste terrain.
1. **Solo ou à plusieurs ?** Conditionne la synchro multi-appareils (aujourd'hui en v2). Rien à trancher avant que la v1 tourne.
2. Deux valeurs qui ne se calibrent que sur le terrain (seuil de vitesse, largeur d'arc de balayage réelle) — à redemander après les 1res sorties.
