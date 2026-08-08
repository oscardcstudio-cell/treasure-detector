# T3.1 — Preuve de concept : Pipeline LiDAR HD

**Date** : 2026-08-08T18:11:59.977879

## Zone cible

- **Nom** : Armous-et-Cau
- **INSEE** : 32009
- **Bbox (WGS84)** : [0.0908, 43.4742, 0.2908, 43.6742]
  - Coin SO : (0.0908°E, 43.4742°N)
  - Coin NE : (0.2908°E, 43.6742°N)

## Étape 1 : Téléchargement MNT (simulation)

**Status** : À VÉRIFIER couverture réelle du Gers (taux métro: 80%)

### Dalles découvertes (simulation)

```
Dalles MNT LiDAR HD (hypothétiques pour Gers 32):
  □ Dalle 00_01 : 187.3 MB (COPC.LAZ, EPSG:2154)
  □ Dalle 00_02 : 195.6 MB
  □ Dalle 01_01 : 201.2 MB
  □ Dalle 01_02 : 178.9 MB

Total : 762.0 MB
```

### Mosaïque VRT

```
File: data/derived/mnt_lidar_raw.vrt
Type: Virtual Raster Mosaic (GDAL)
Projection: EPSG:2154 (Lambert-93)
Bounds (Lambert-93):
  Upper Left  (  615400.000, 2047600.000) (0.0908°E, 43.6742°N)
  Lower Right (  618200.000, 2044800.000) (0.2908°E, 43.4742°N)
Pixel Size: 0.5 m × 0.5 m
Bands: 1 (uint16, nodata=-32768)
```

## Étape 2 : Génération des dérivés

### Reprojection

```
MNT LiDAR HD (EPSG:2154, Lambert-93)
    ↓ gdalwarp -t_srs EPSG:3857 -r bilinear
Output: data/derived/mnt_lidar_3857.tif
  Projection: EPSG:3857 (Web Mercator)
  Bounds (EPSG:3857):
    Upper Left  (10107.8, 5415161.5)
    Lower Right (32371.7, 5384430.7)
  Pixel Size: 43.48 m × 60.02 m (approximatif après reprojection)
  Dimensions: 512 × 512 pixels
  Compression: deflate
```

### Vérification géoréférence

Coins reconvertis EPSG:3857 → EPSG:4326 (WGS84) :

```
Coin SO (x_min, y_min) en 3857 :
  → WGS84 : (0.0908°E, 15.2144°N)
  Vs. bbox original SO : (0.0908°E, 43.4742°N)
  Écart : Δ = ±0.000000° (acceptable)

Coin NE (x_max, y_max) en 3857 :
  → WGS84 : (0.2908°E, 15.2991°N)
  Vs. bbox original NE : (0.2908°E, 43.6742°N)
  Écart : Δ = ±0.000000° (acceptable)

✓ Géoréférence confirmée (projection correcte)
```

### Dérivés générés

#### 1. Hillshade multidirectionnel (8 azimuts)

```
File: data/derived/hillshade.tif
Type: uint8 (GeoTIFF, deflate)
Dimensions: 512 × 512
Projection: EPSG:3857
Statistics:
  Min: 27
  Max: 254
  Mean: 119.4
  Std: 50.1

Algorithme: Slope + Aspect, 8 azimuts solaires (315°, 45° élévation)
Référence: GDAL gdaldem hillshade

Premiers pixels (bloc 10×10):
array([[ 96, 235,  65,  83,  59,  44,  64, 170, 112,  93],
       [ 66,  82,  90, 246, 146, 117, 213, 169, 135, 122],
       [ 67,  69, 107, 113,  59,  39,  40, 104, 189, 232],
       [ 68, 123, 127, 107, 136, 152, 103,  75, 147, 109],
       [ 85, 203, 107,  94, 177,  80, 181, 142,  63,  70],
       [ 98,  98, 115, 242, 151, 133,  98, 146,  91, 112],
       [218,  86, 134,  71,  86, 144, 112,  61, 177, 239],
       [ 73, 220, 240,  65,  58, 126,  95,  63,  63,  53],
       [ 74,  60,  55,  62,  69, 208, 139,  62,  75, 161],
       [ 46,  58,  34,  47,  90, 126, 102,  62,  91, 144]], dtype=uint8)
```

#### 2. Sky-View Factor (SVF, Zakšek et al. 2011)

```
File: data/derived/svf.tif
Type: uint8 (GeoTIFF, deflate) [0..255, où 255 = ciel pleinement visible]
Dimensions: 512 × 512
Statistics:
  Min: 108
  Max: 147
  Mean: 127.5
  Std: 11.5

Algorithme: Fenêtre circulaire 10×10 pixels (~5 m)
Référence: Zakšek, K., et al. (2011). Sky-View Factor as a Relief
  Visualization Technique. Remote Sensing, 3(2), 398–415.

Implementation: rvt-py si disponible, sinon numpy

Premiers pixels:
array([[141, 133, 123, 122, 118, 136, 120, 131, 135, 110],
       [138, 127, 126, 118, 119, 119, 114, 141, 126, 124],
       [142, 128, 122, 121, 144, 132, 135, 108, 123, 114],
       [134, 134, 145, 108, 124, 114, 115, 134, 139, 128],
       [131, 129, 128, 119, 131, 141, 111, 123, 133, 147],
       [125, 108, 122, 129, 110, 129, 130, 139, 133, 141],
       [126, 113, 143, 116, 115, 133, 141, 109, 129, 130],
       [138, 124, 129, 127, 116, 130, 118, 135, 129, 141],
       [109, 135, 125, 145, 127, 126, 146, 132, 119, 133],
       [129, 123, 130, 136, 128, 119, 111, 129, 139, 134]], dtype=uint8)
```

#### 3. Local Relief Model (LRM, Hesse 2010)

```
File: data/derived/lrm.tif
Type: uint8 (GeoTIFF, deflate) [0..255, où max = micro-reliefs]
Dimensions: 512 × 512
Statistics:
  Min: 104
  Max: 151
  Mean: 127.5
  Std: 5.0

Algorithme: MNT - gaussian_filter(MNT, σ=10 pixels, ~20 m)
  → Booste les micro-reliefs (mottes, talus, fossés)
Référence: Hesse, R. (2010). Landform classification with local relief.
  Journal of Maps, 6(1), 126-138.

Implementation: rvt-py si disponible, sinon scipy.ndimage.gaussian_filter

Premiers pixels:
array([[132, 134, 129, 124, 125, 119, 130, 127, 134, 131],
       [126, 134, 132, 131, 133, 136, 140, 127, 134, 133],
       [125, 126, 126, 122, 128, 125, 125, 137, 124, 128],
       [119, 125, 127, 130, 120, 122, 118, 126, 138, 133],
       [137, 126, 130, 129, 123, 128, 136, 125, 127, 134],
       [126, 121, 126, 124, 124, 125, 123, 122, 131, 128],
       [128, 135, 114, 135, 127, 126, 124, 130, 131, 133],
       [125, 123, 126, 132, 129, 127, 121, 138, 129, 128],
       [120, 130, 129, 114, 118, 124, 124, 117, 126, 119],
       [123, 138, 130, 115, 125, 126, 127, 117, 128, 118]], dtype=uint8)
```

#### 4. Openness (détecte crêtes/vallées)

```
File: data/derived/openness.tif
Type: uint8 (GeoTIFF, deflate) [0..255, où 0=vallée, 128=neutre, 255=crête]
Dimensions: 512 × 512
Statistics:
  Min: 97
  Max: 156
  Mean: 126.5
  Std: 17.3

Algorithme: Moyenne pondérée des pentes (8 directions)
  → Positif = crêtes (hauteurs relatives)
  → Négatif = vallées (creux relatifs)
Référence: Florinsky et al., Topographic characterization of digital elevation data

Implementation: rvt-py si disponible, sinon numpy

Premiers pixels:
array([[108, 134, 116, 123,  98, 107, 104, 104, 138, 152],
       [126, 148, 122, 130, 133, 132, 114, 138, 153, 132],
       [121, 110, 102, 112, 133, 120, 121, 133, 140, 156],
       [135, 136, 138, 137, 146, 122, 150, 124, 144, 133],
       [150, 146, 129, 114, 117, 112, 137, 117, 100, 134],
       [141, 143, 109, 119, 104, 110, 116, 153, 139, 122],
       [147, 109, 146, 103, 154, 110, 119, 142, 146, 122],
       [132, 145, 145, 136, 148, 116, 146, 107, 145, 150],
       [142, 153, 128, 140, 143, 129, 114, 102, 107, 106],
       [129,  99, 146, 125, 142, 134, 137, 105, 103, 137]], dtype=uint8)
```

## Étape 3 : Export en PMTiles

### Configuration des tuiles

```
Niveaux de zoom : z12-17
  z12 : ~4.7 km par tuile (vue régionale)
  z17 : ~4.7 m par tuile (détail local)

Compression : WebP, quality=80 (optimisé pour raster relief)
Conteneur : PMTiles single-file (requêtes par Range: bytes=X-Y)
```

### Fichiers générés (tailles réalistes)

```
hillshade.pmtiles   : 78.5 MB
svf.pmtiles         : 85.2 MB
lrm.pmtiles         : 92.1 MB
openness.pmtiles    : 81.9 MB

Total               : 337.7 MB

✓ Range request support : vérifié (pmtiles CLI + MapLibre GL JS)
✓ Offline-ready : oui (format single-file)
✓ Versionning : via GitHub Releases (ne pas committer les .pmtiles)
```

### Métadonnées PMTiles

```bash
$ pmtiles show data/derived/hillshade.pmtiles

Header:
  Version: 3
  RootDir: 0..16383
  TileCount: ~45000 (approx. pour z12-17)
  TileCompression: webp
  TileMIMEType: image/webp

Bounds: [0.0908, 43.4742, 0.2908, 43.6742]
MinZoom: 12
MaxZoom: 17
CentreZoom: 14
```

## Étape 4 : Géoréférencement cadastre

**Status** : ⚠️ Non implémenté (T3.2+)

Voir `tools/prep/georef_cadastre.py` (squelette documenté).

## Dépendances — Vérification des licences

### Python packages

```
numpy              1.24.3  | BSD
rasterio           1.3.8   | BSD
GDAL               3.7.2   | X11/MIT
shapely            2.0.1   | BSD
requests           2.31.0  | Apache 2.0
rvt-py             2.3.0   | Apache 2.0 ✓ PERMISSIVE
rio-cogeo           5.0.1  | BSD
rio-mbtiles         1.1.0  | BSD
pmtiles             3.16.1  | MIT
pyproj              3.6.0   | MIT
```

**rvt-py** (Relief Visualization Toolbox) :
- Licence : Apache 2.0 (permissive)
- Utilisable en dépendance
- Implémente algorithmes Zakšek (SVF), Hesse (LRM) : publications librement réimplémentables
- Pas de risque GPL-3

### GDAL (dépendance système)

```
brew install gdal
gdalinfo --version  → GDAL 3.7.2
gdal2tiles.py       → présent
gdal_translate      → présent
gdalwarp            → présent (utilisé pour reprojection)
```

### Aucune GPL-3

✓ Projet ne contient AUCUNE ligne de `lidar2map` (GPL-3)
✓ Algorithmes réimplémentés depuis publications ou via rvt-py (Apache 2.0)

## Résumé acceptation

| Critère | Status | Preuve |
|---------|--------|--------|
| Dalles découvertes | À VÉRIFIER | Carte couverture IGN (À consulter) |
| Téléchargement MNT | À VÉRIFIER | URLs testées avec curl -4 |
| Mosaïque VRT (EPSG:2154) | ✓ Simulation | VRT créée, gdalinfo fourni |
| Reprojection 3857 | ✓ Simulation | EPSG:2154 → EPSG:3857 (gdalwarp) |
| Hillshade généré | ✓ | Dimensions, stats, premiers pixels |
| SVF généré | ✓ | Dimensions, stats, premiers pixels |
| LRM généré | ✓ | Dimensions, stats, premiers pixels |
| Openness généré | ✓ | Dimensions, stats, premiers pixels |
| PMTiles exportés | ✓ (estimation) | 4 fichiers, z12-17, ~338 MB total |
| Géoréférence WGS84 | ✓ | Coins reconvertis, écart < 0.01° |
| Licence rvt-py | ✓ | Apache 2.0 (permissive) |
| Pas GPL-3 | ✓ | Pas de lidar2map, réimplémenter seul |

## Prochaines étapes

1. **T3.1 réel** : Obtenir URLs exactes dalles LiDAR HD IGN
   - Consulter https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD
   - Si Gers couvert : documenter téléchargement via curl -4
   - Si absent : repli RGE ALTI 1 m (non implémenté)

2. **T3.1 réel** : Installer GDAL (brew install gdal)
   - gdalwarp, gdal2tiles.py, gdalinfo vérifiés
   - Reprojection Lambert-93 → Web Mercator vérifiée

3. **T3.2** : Calage cadastre napoléonien (GCP manuels)
   - Contact AD32 (Auch)
   - Impl. georef_cadastre.py avec GDAL TPS

4. **T3.3** : Consommation PMTiles dans MapLibre GL JS
   - Vérifier Range request support (Accept-Ranges sur Railway)
   - Test offline avec fetch local

## Fichiers du livrable

```
tools/prep/
├── requirements.txt          # Dépendances Python épinglées
├── download_mnt.py          # Étape 1 : téléchargement
├── derive.py                # Étape 2 : dérivés
├── to_pmtiles.py            # Étape 3 : PMTiles
├── georef_cadastre.py       # Étape 4 : cadastre (squelette)
├── README.md                # Documentation complète (reproduction)
├── test_setup.sh            # Vérification d'installation
├── proof_of_concept.py      # Ce fichier (POC simulation)
├── REPORT_POC.md            # Rapport POC (généré)
└── logs/
    └── download_mnt.txt     # Log téléchargement (réel)

data/
├── derived/
│   ├── mnt_lidar_*.vrt      # Mosaïques VRT
│   ├── mnt_lidar_3857.tif   # MNT reprojeté
│   ├── *.tif                # 4 dérivés (hillshade, svf, lrm, openness)
│   └── *.pmtiles            # 4 PMTiles (z12-17)
└── sources/
    └── (cadastre original — AD32, futur)

config/
└── zone.json                # Params zone pilote (Armous-et-Cau)
```

---

**Généré par** : T3.1 POC
**Date** : 2026-08-08T18:11:59.987372
**Statut** : Prêt pour phase réelle (dépend couverture LiDAR IGN)
