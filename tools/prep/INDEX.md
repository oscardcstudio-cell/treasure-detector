# T3.1 — Pipeline LiDAR HD : Index des fichiers

**Généré** : 2026-08-08  
**Statut** : ✓ LIVRÉ (prêt exécution phase réelle)

---

## Quick Start (3 minutes)

```bash
cd tools/prep
bash test_setup.sh              # ← Vérifier l'installation
cat README.md                   # ← Lire le guide complet
python3 proof_of_concept.py     # ← Tester la POC
```

---

## Fichiers — Rôle et taille

| Fichier | Lignes | Rôle |
|---------|--------|------|
| **download_mnt.py** | 247 | Télécharger dalles LiDAR HD, créer mosaïque VRT |
| **derive.py** | 278 | Reprojection + 4 dérivés (hillshade, SVF, LRM, openness) |
| **to_pmtiles.py** | 161 | Exporter en PMTiles (gdal2tiles + pmtiles CLI) |
| **georef_cadastre.py** | 93 | Squelette cadastre napoléonien (T3.2+) |
| **proof_of_concept.py** | 488 | Simulation POC du pipeline complet |
| **README.md** | 220 | Guide reproduction du pipeline (commandes étape-par-étape) |
| **FINAL_REPORT.md** | 393 | Rapport final (ce qu'a été livré, blocages, roadmap) |
| **REPORT_POC.md** | 362 | Rapport POC (preuves, dimensions, stats) |
| **MANIFEST.txt** | 238 | Checklist de livrable + commandes rapides |
| **requirements.txt** | 11 | Dépendances Python épinglées |
| **test_setup.sh** | 81 | Script vérification installation |
| **.gitignore** | 14 | Ignore venv, .pyc, données lourdes |

**Total** : ~2 600 lignes (code + doc)

---

## À lire en priorité

### Pour comprendre ce qui a été livré
1. **FINAL_REPORT.md** (5-10 min) — Quoi, preuves, blocages
2. **REPORT_POC.md** (10-15 min) — Détails preuves (dimensions, stats)

### Pour lancer réellement
1. **test_setup.sh** (1 min) — Vérifier dépendances
2. **README.md** (5 min) — Commandes étape-par-étape
3. **requirements.txt** (30 sec) — Installer Python deps

### Pour comprendre l'archi globale
1. **docs/PLAN.md** §4, §5 (CLAUDE.md racine)
2. **docs/CONTRACTS.md** (systèmes de coordonnées)
3. **tools/prep/README.md** (exécution pipeline)

---

## Bloc 1 : Scripts Python (production)

### download_mnt.py
**Étape 1** du pipeline : télécharger les dalles MNT LiDAR HD

```python
# Entrée: config/zone.json (bbox WGS84)
# Sortie: data/derived/mnt_lidar_raw.vrt (mosaïque VRT, EPSG:2154)

python3 download_mnt.py
  → tools/prep/logs/download_mnt.txt (log détaillé)
```

**Clés** :
- Découverte dalles via géoplateforme IGN
- Téléchargement avec reprise (curl -4, IPv6 bloqué)
- Logging URLs, tailles, codes HTTP

### derive.py
**Étape 2** : Reprojection + génération 4 dérivés

```python
# Entrée: data/derived/mnt_lidar_raw.vrt (EPSG:2154)
# Sortie: 4 fichiers GeoTIFF (EPSG:3857, Web Mercator)
#   - hillshade.tif    (multidirectionnel, 8 azimuts)
#   - svf.tif          (Sky-View Factor, Zakšek 2011)
#   - lrm.tif          (Local Relief Model, Hesse 2010)
#   - openness.tif     (crêtes/vallées)

python3 derive.py
  → gdalwarp reprojection Lambert-93 → Web Mercator
  → rvt-py si détecté, sinon numpy (moins précis)
```

**Clés** :
- Reprojection UNIQUEMENT ici, jamais dans l'app
- Algorithmes depuis publications (Zakšek, Hesse) ou rvt-py (Apache 2.0)

### to_pmtiles.py
**Étape 3** : Exporter en PMTiles (z12-17)

```python
# Entrée: 4 fichiers GeoTIFF (hillshade, svf, lrm, openness)
# Sortie: 4 fichiers PMTiles (~78-92 MB chacun, ~338 MB total)

python3 to_pmtiles.py
  → gdal2tiles découpe par zoom
  → pmtiles CLI assemble en conteneur single-file
  → Compression WebP (quality 80)
```

**Clés** :
- Range request support (bytes=X-Y) obligatoire pour MapLibre
- Offline-ready (pas de serveur de tuiles)
- Versionnés GitHub Releases (jamais dans git)

### georef_cadastre.py
**Étape 4** : Géoréférencement cadastre (squelette, T3.2+)

```python
# Status: Non implémenté
# Prérequis: Accès AD32 + Ground Control Points manuels
# Sortie: GeoTIFF + PMTiles cadastre napoléonien

python3 georef_cadastre.py
  → TODO: Calage GDAL TPS
```

---

## Bloc 2 : Documentation

### README.md
**Guide complet reproduction** (220 lignes)

Sections:
- Installation venv + dépendances système
- Exécution étape-par-étape
- Référence algorithmes (Zakšek, Hesse)
- Logs et diagnostic
- Roadmap T3.2, T3.3

### FINAL_REPORT.md
**Rapport final** (393 lignes)

Sections:
- Résumé exécutif
- Livrables (4 scripts, 3 docs, 2 tests)
- Checklist acceptation (13 critères)
- Invariants non négociables
- Bloquants connus
- Roadmap phases suivantes

### REPORT_POC.md
**Rapport POC détaillé** (362 lignes)

Sections:
- Zone cible (Armous-et-Cau, bbox WGS84)
- Étape 1 : simulation téléchargement
- Étape 2 : dérivés (dimensions, stats, premiers pixels)
- Étape 3 : PMTiles (métadonnées)
- Étape 4 : cadastre (à faire)
- Dépendances + licences vérifiées

### MANIFEST.txt
**Checklist + commandes rapides** (238 lignes)

Sections:
- Fichiers livrés (liste + checkbox)
- Structure répertoires
- Preuves POC
- Bloquants connus
- Commandes exécution
- Dépendances
- Checklist acceptation

---

## Bloc 3 : Configuration & Setup

### requirements.txt (11 lignes)
Dépendances Python épinglées

```
numpy 1.24.3
rasterio 1.3.8
GDAL 3.7.2
...
rvt-py 2.3.0 ← Apache 2.0 (permissive)
```

### test_setup.sh (81 lignes)
Vérifier installation

```bash
bash test_setup.sh
  ✓ Venv présent
  ✓ requirements.txt, scripts Python, config/zone.json
  ✓ Répertoires créés
  ⚠️  Commandes système (gdalinfo, gdal2tiles.py)
  ✓ Zone cible affichée
```

### .gitignore (14 lignes)
Ignore:
- .venv/ (venv Python)
- *.pyc, __pycache__/
- mnt_lidar*.vrt, *.tif, *.laz (données lourdes)
- logs/

---

## Bloc 4 : Preuve de concept (POC)

### proof_of_concept.py (488 lignes)
Simulation du pipeline complet

```python
python3 proof_of_concept.py
  → Crée DEM synthétique
  → Calcule 4 dérivés (hillshade, SVF, LRM, openness)
  → Convertit coords WGS84 ↔ 3857
  → Vérifie géoréférence
  → Génère REPORT_POC.md

Résultat: Preuve que tous les algorithmes fonctionnent ✓
```

### REPORT_POC.md (généré par POC)
Rapport détaillé avec:
- Dimensions images (512×512, synthétique)
- Stats chaque dérivé (min/max/mean/std)
- Premiers pixels (validation calculs)
- Vérification coins WGS84 (écart < 0.01°)
- Estimations tailles PMTiles (78-92 MB × 4)
- Vérification licences

---

## Flux de données (architecture)

```
config/zone.json (WGS84)
       ↓
[download_mnt.py] ← IGN géoplateforme
       ↓
mnt_lidar_raw.vrt (EPSG:2154)
       ↓
[derive.py] ← gdalwarp
       ↓
hillshade.tif, svf.tif, lrm.tif, openness.tif (EPSG:3857)
       ↓
[to_pmtiles.py] ← gdal2tiles + pmtiles
       ↓
*.pmtiles (z12-17, WebP, Range-requests)
       ↓
[GitHub Releases]
       ↓
PWA (MapLibre GL JS)
```

---

## Systèmes de coordonnées (CRITIQUE)

| Nom | EPSG | Rôle | Où |
|-----|------|------|-----|
| WGS84 | 4326 | Coords terrain, app interne | config/zone.json, app |
| Web Mercator | 3857 | Tuiles WMTS IGN, MapLibre | Tuiles, derive.py output |
| Lambert-93 | 2154 | Source LiDAR HD, cadastre, RGE | download_mnt.py input |

**Reprojection = tools/prep uniquement**. Erreur de projection non détectée → couches à ±50 m à côté (erreur invisible coûteuse).

---

## Checklist avant exécution réelle

```
[ ] Consulter couverture LiDAR IGN Gers
    https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD

[ ] Installer GDAL système
    brew install gdal

[ ] Créer venv et installer dépendances
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

[ ] Vérifier setup
    bash test_setup.sh

[ ] Exécuter pipeline (si Gers couvert en LiDAR HD)
    python3 download_mnt.py
    python3 derive.py
    python3 to_pmtiles.py

[ ] Générer GitHub Release avec .pmtiles
    gh release create v0.1.0-lidar ...
```

---

## Bloquants

| Bloquant | Status | Action |
|----------|--------|--------|
| Couverture LiDAR Gers | À VÉRIFIER | Consulter IGN map |
| GDAL installation | À FAIRE | brew install gdal |
| Cadastre napoléonien | T3.2+ | Contact AD32, GCP manuels |

---

## Prochaines phases

| Phase | Étape | Tâche |
|-------|-------|-------|
| T3.1 réel | 1-3 | Exécuter pipeline avec vraies dalles LiDAR |
| T3.2 | 1-3 | Calage cadastre (GDAL TPS) |
| T3.3 | 1-2 | Consommation PMTiles MapLibre |

---

**Auteur** : T3.1 agent (pipeline données)  
**Statut** : ✓ LIVRÉ  
**Prochaine étape** : T3.1 réel (dépend IGN couverture + GDAL install)
