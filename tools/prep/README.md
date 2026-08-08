# tools/prep — Pipeline de préparation des données (T3.1)

Pipeline Python pour transformer les sources IGN (LiDAR HD, cartes) en couches raster exploitables par la PWA.

## Aperçu

```
LiDAR HD (0,5 m, COPC.LAZ, EPSG:2154)
         ↓
    [download_mnt.py]  ← télécharger les dalles MNT couvrant la bbox
         ↓
    mnt_lidar_raw.vrt (EPSG:2154)
         ↓
    [derive.py]  ← reprojeter + générer dérivés (hillshade, SVF, LRM, openness)
         ↓
    hillshade.tif, svf.tif, lrm.tif, openness.tif (EPSG:3857, Web Mercator)
         ↓
    [to_pmtiles.py]  ← découper en tuiles + assembler en PMTiles
         ↓
    *.pmtiles (z12-17, MapLibre-ready)
         ↓
    [GitHub Release]  ← versionner les artefacts
```

## Installation (depuis zéro)

### 1. Créer l'environnement virtuel

```bash
cd tools/prep
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Vérifier les dépendances système

```bash
# macOS
brew install gdal pmtiles
gdal-config --version
gdalinfo --version
gdal2tiles.py --version
pmtiles --version
```

### 3. Charge de travail requise

- **Espace disque** : ≥ 10 Go libres (MNT LiDAR ~2 Go, dérivés/intermédiaires ~3-5 Go)
- **Temps de calcul** : 
  - Téléchargement : 20-60 min (dépend du réseau et de la couverture)
  - Reprojection + dérivés : 30-45 min
  - PMTiles : 10-15 min par couche

## Usage — Exécution complète

### Initialisation (une fois)

```bash
source .venv/bin/activate
```

### Exécution du pipeline complet

**Étape 1 : Télécharger le MNT LiDAR HD**

```bash
python3 download_mnt.py
```

Résultat :
- `data/derived/mnt_lidar_raw.vrt` (mosaïque virtuelle, EPSG:2154)
- `tools/prep/logs/download_mnt.txt` (liste des dalles, URLs testées, tailles)

**Notes** :
- Bloquant phase 3 : vérifier que le Gers est couvert en LiDAR HD.
  Carte de suivi : https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD
- Si **absent** → repli sur RGE ALTI 1 m (non implémenté, voir PLAN.md §4.2)
- Commandes testées : `curl -4` (IPv6 bloqué sur Mac)

**Étape 2 : Générer les dérivés du MNT**

```bash
python3 derive.py
```

Résult :
- `data/derived/hillshade.tif` (relief multidirectionnel, uint8)
- `data/derived/svf.tif` (Sky-View Factor, Zakšek et al. 2011, uint8)
- `data/derived/lrm.tif` (Local Relief Model, Hesse 2010, uint8)
- `data/derived/openness.tif` (détection crêtes/vallées, uint8)

Tous en EPSG:3857 (Web Mercator), compressés en deflate.

**Algorithmes** :
- **Hillshade** : pente + aspect, 8 azimuts solaires (315°, 45° élévation)
- **SVF** : fenêtre 10×10 pixels (~5 m sur MNT 0,5 m)
- **LRM** : filtre gaussien σ=10 pixels (~20 m), booste micro-reliefs
- **Openness** : détecte crêtes (>0) et vallées (<0)

**Note rvt-py** :
- Si détecté : SVF/LRM/openness via rvt-py (publications Zakšek/Hesse)
- Si absent : implémentations numpy (moins précises)

Licence rvt-py : ✓ Apache 2.0 (permissive) → utilisable en dépendance

**Étape 3 : Exporter en PMTiles**

```bash
python3 to_pmtiles.py
```

Résultat :
- `data/derived/hillshade.pmtiles` (~50-100 MB)
- `data/derived/svf.pmtiles`
- `data/derived/lrm.pmtiles`
- `data/derived/openness.pmtiles`

Tous en z12-17 (zoom natif pour détail du relief local).

**Format** :
- Conteneur single-file, requêtes par Range (bytes=X-Y)
- Compression WebP (quality 80), optimisée pour MapLibre GL JS
- Fonctionne en offline, rechargeable depuis cache

**Vérification** :
```bash
# Afficher les métadonnées PMTiles
pmtiles show data/derived/hillshade.pmtiles
```

**Étape 4 : Géoréférencement du cadastre napoléonien**

```bash
python3 georef_cadastre.py
```

**Status** : ⚠️ Non implémenté (T3.2 ou après).

Prérequis :
- Accès aux scans des AD32 (contact archive)
- Tableau de Ground Control Points (amers manuels)
- Calage GDAL TPS (thin plate spline)

Voir `georef_cadastre.py` (squelette documenté).

## Artefacts versionnés — GitHub Releases

Les PMTiles générés ne doivent **JAMAIS** entrer dans git (trop lourds, repo public).

Workflow :
```bash
# Après l'exécution du pipeline, générer une release GitHub
gh release create v0.1.0-lidar \
  --notes "MNT LiDAR HD + dérivés pour Armous-et-Cau" \
  data/derived/*.pmtiles
```

L'app télécharge les PMTiles par URL versionnée :
```json
{
  "hillshade": "https://github.com/oscardcstudio-cell/treasure-detector/releases/download/v0.1.0-lidar/hillshade.pmtiles",
  ...
}
```

## Invariants non négociables

**Reprojection** :
- Source LiDAR HD : **EPSG:2154** (Lambert-93)
- Tuiles WMTS IGN : **EPSG:3857** (Web Mercator, PM)
- App : **EPSG:4326** (WGS84, données)
- **Reprojection = tools/prep uniquement**. Jamais dans l'app.

Un décalage de projection non détecté produit des couches affichées à quelques dizaines de mètres à côté — l'erreur la plus discrète et la plus coûteuse du projet.

**Pas de GPL-3** :
- Ne jamais copier lidar2map (GPL-3 contaminerait le repo public)
- Réimplémenter depuis les publications (Zakšek, Hesse)
- rvt-py OK (Apache 2.0)

## Logs et diagnostic

Logs d'exécution :
- `tools/prep/logs/download_mnt.txt` : URLs testées, tailles, codes d'erreur
- stdout des scripts (rediriger pour persister)

Diagnostic :
```bash
# Vérifier GDAL
gdalinfo data/derived/mnt_lidar_raw.vrt | head -30

# Vérifier un GeoTIFF dérivé
gdalinfo data/derived/hillshade.tif

# Vérifier un PMTiles
pmtiles show data/derived/hillshade.pmtiles
```

## Références documentaires du projet

- `docs/PLAN.md` §4.2 (LiDAR HD, couverture Gers)
- `docs/CONTRACTS.md` (systèmes de coordonnées, invariants)
- `docs/zone/SOURCES.md` (procédure IGN, contacts, accès)

## Prochaines phases (roadmap)

| Phase | Étape | Tâche |
|---|---|---|
| **T3.2** | 1 | Calage cadastre napoléonien (GCP manuels, QGIS) |
| **T3.2** | 2 | Vectorisation BD TOPO (chemins, cours d'eau) en GeoJSON |
| **T3.3** | 1 | Consommation PMTiles dans MapLibre GL JS |
| **T1.2** | 1 | Intégration Supabase pour persistance des résultats |

---

**Auteur** : T3.1 agent (pipeline données)  
**Date** : 2026-08-08  
**Repo** : https://github.com/oscardcstudio-cell/treasure-detector  
**Licence** : MIT (code) + Etalab 2.0 (données IGN)
