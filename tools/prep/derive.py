#!/usr/bin/env python3
"""
T3.1 — Générer les dérivés du MNT LiDAR HD (2/4).

À partir d'une mosaïque VRT reprojetée en EPSG:3857 (Web Mercator),
générer les couches de visualisation:
  1. Hillshade multidirectionnel (8 azimuts)
  2. Sky-View Factor (SVF)
  3. Local Relief Model (LRM)
  4. Openness (positif)

Algorithmes:
  - Hillshade: slope + aspect + 8 directions solaires (20°, 45°, 270° élévation)
  - SVF: Zakšek et al. 2011 "Sky-View Factor as a Relief Visualization Technique"
    → Mesure la fraction du ciel visible depuis chaque point (0..1)
    → Fenêtre typique: 10×10 pixels (5 m sur un MNT 0,5 m)
  - LRM: Hesse 2010 "Local Relief Model" (différence entre MNT et filtre gaussien)
    → Fenêtre: ~20 m (40 pixels sur 0,5 m), booste les micro-reliefs
  - Openness: moyenne pondérée des pentes (détecte les vallées = négatif)

Implementation:
  - rvt-py si licence permissive (à vérifier)
  - Sinon: réimplémentation numpy/rasterio depuis les publications
  - Entrée: data/derived/mnt_lidar_raw.vrt (Lambert-93)
  - Reprojet en EPSG:3857 (Web Mercator) pour MapLibre
  - Sortie: data/derived/{hillshade, svf, lrm, openness}.tif (uint8, z12-17)

Références:
  - Zakšek, K., Oštir, K., & Kokalj, Ž. (2011). Sky-View Factor as a Relief
    Visualization Technique. Remote Sensing, 3(2), 398–415.
  - Hesse, R. (2010). Landform classification with local relief. Journal of Maps, 6(1), 126-138.
  - rvt-py: https://github.com/EarthObservation/rvt-py (vérifier licence)
"""

import sys
import json
from pathlib import Path
from typing import Optional
import numpy as np
import rasterio
from rasterio.io import MemoryFile
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from scipy.ndimage import gaussian_filter
from tqdm import tqdm

# Essayer rvt-py (si licence permissive)
try:
    import rvt.terrain_analysis as ta
    HAS_RVT = True
except ImportError:
    HAS_RVT = False

REPO_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = REPO_ROOT / "data" / "derived"
MNT_VRT = DATA_DIR / "mnt_lidar_raw.vrt"

def reproject_to_web_mercator(src_path: Path) -> Optional[Path]:
    """
    Reprojeter le MNT de EPSG:2154 (Lambert-93) en EPSG:3857 (Web Mercator).

    Sortie: data/derived/mnt_lidar_3857.tif
    """
    output = DATA_DIR / "mnt_lidar_3857.tif"

    if output.exists():
        print(f"Déjà reprojeté: {output}")
        return output

    import subprocess
    cmd = [
        "gdalwarp",
        "-s_srs", "EPSG:2154",
        "-t_srs", "EPSG:3857",
        "-r", "bilinear",  # Interpolation pour perte de résolution
        "-dstnodata", "-32768",
        "-co", "COMPRESS=deflate",
        "-co", "TILED=YES",
        "-co", "BLOCKXSIZE=512",
        "-co", "BLOCKYSIZE=512",
        str(src_path),
        str(output)
    ]

    print(f"Reprojection vers EPSG:3857...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERREUR gdalwarp: {result.stderr}")
        return None

    return output

def compute_hillshade(dem: np.ndarray, resolution: float, azimuth: float = 315.0, elevation: float = 45.0) -> np.ndarray:
    """
    Calcul du hillshade sur 8 directions azimutales (multidirectionnel).

    dem: array 2D (MNT)
    resolution: taille du pixel en mètres
    Retour: uint8 [0..255]
    """
    # Référence: GDAL gdaldem hillshade
    from scipy.ndimage import sobel

    # Gradients
    x = sobel(dem, axis=1) / (8 * resolution)
    y = sobel(dem, axis=0) / (8 * resolution)

    # Slope et aspect
    slope = np.pi / 2 - np.arctan(np.sqrt(x**2 + y**2))
    aspect = np.arctan2(-x, y)

    # Illumination multi-azimut (moyenne de 8 directions)
    azimuths = np.linspace(0, 2*np.pi, 9)[:-1]
    shades = []

    for az in azimuths:
        shaded = np.sin(slope) * np.cos(np.radians(elevation)) * np.cos(az - aspect) + \
                 np.cos(slope) * np.sin(np.radians(elevation))
        shades.append(shaded)

    hillshade = np.mean(shades, axis=0)
    hillshade = (hillshade + 1) / 2  # Normaliser [0..1]
    return (hillshade * 255).astype(np.uint8)

def compute_svf(dem: np.ndarray, radius: int = 10) -> np.ndarray:
    """
    Sky-View Factor (Zakšek et al. 2011).

    dem: array 2D
    radius: fenêtre d'analyse (pixels)
    Retour: float [0..1]
    """
    if HAS_RVT:
        print("  → SVF via rvt-py")
        return ta.sky_view_factor(dem, resolution=1, radius_cell=radius)

    # Réimplémentation numpy (approximation)
    print("  → SVF via numpy (approximation)")
    h, w = dem.shape
    svf = np.ones_like(dem, dtype=np.float32)

    # Fenêtre circulaire
    y, x = np.ogrid[-radius:radius+1, -radius:radius+1]
    mask = x**2 + y**2 <= radius**2

    for i in range(1, h-1):
        for j in range(1, w-1):
            # Fenêtre locale
            i1, i2 = max(0, i-radius), min(h, i+radius+1)
            j1, j2 = max(0, j-radius), min(w, j+radius+1)
            local = dem[i1:i2, j1:j2]

            # Calcul simplifié: hauteur maximale visible / distance
            # (vrai SVF nécessite 16 rayons; ici approximation)
            heights = np.where(mask[:i2-i1, :j2-j1], dem[i1:i2, j1:j2] - dem[i, j], -np.inf)
            max_height = np.nanmax(heights)
            svf[i, j] = 1.0 if max_height < 0 else 0.5  # Simplifié

    return svf

def compute_lrm(dem: np.ndarray, sigma: float = 10) -> np.ndarray:
    """
    Local Relief Model (Hesse 2010).

    dem: array 2D
    sigma: écart-type du filtre gaussien (pixels, ~20 m → 40 pixels sur 0,5 m)
    Retour: float (normalisé)
    """
    if HAS_RVT:
        print("  → LRM via rvt-py")
        return ta.local_relief_model(dem, sigma=sigma)

    # Réimplémentation
    print("  → LRM via scipy")
    smoothed = gaussian_filter(dem.astype(np.float32), sigma=sigma, mode='constant', cval=np.nan)
    lrm = dem - smoothed
    # Normaliser
    lrm_norm = (lrm - np.nanmin(lrm)) / (np.nanmax(lrm) - np.nanmin(lrm))
    return lrm_norm

def compute_openness(dem: np.ndarray, radius: int = 10) -> np.ndarray:
    """
    Openness (détecte crêtes = positif, vallées = négatif).

    dem: array 2D
    radius: fenêtre d'analyse
    Retour: float [-1..1]
    """
    if HAS_RVT:
        print("  → Openness via rvt-py")
        return ta.openness(dem, radius_cell=radius, positive=True)

    # Approximation: moyenne de la pente positive sur 8 directions
    print("  → Openness via numpy (approximation)")
    from scipy.ndimage import sobel
    h, w = dem.shape
    openness = np.zeros_like(dem, dtype=np.float32)

    for dy in [-1, 0, 1]:
        for dx in [-1, 0, 1]:
            if dy == 0 and dx == 0:
                continue
            # Pente directionnelle
            slope_dir = (dem - np.roll(dem, (dy, dx), axis=(0, 1))) / np.sqrt(dy**2 + dx**2)
            openness += slope_dir

    openness /= 8
    return np.clip(openness, -1, 1)

def save_layer(data: np.ndarray, output_path: Path, profile: dict):
    """Sauvegarder une couche en GeoTIFF."""
    profile.update(dtype=data.dtype, count=1)
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(data, 1)
    print(f"  ✓ {output_path.name}")

def main():
    print("=" * 70)
    print("T3.1 — Pipeline LiDAR HD (étape 2/4: dérivés du MNT)")
    print("=" * 70)

    if not MNT_VRT.exists():
        print(f"ERREUR: MNT VRT non trouvé: {MNT_VRT}")
        print("Exécuter download_mnt.py d'abord.")
        return 1

    # Reprojeter
    mnt_3857 = reproject_to_web_mercator(MNT_VRT)
    if not mnt_3857:
        return 1

    # Charger le MNT reprojeté
    print(f"\nChargement MNT: {mnt_3857.name}")
    with rasterio.open(mnt_3857) as src:
        dem = src.read(1)
        profile = src.profile.copy()

    print(f"  Dimensions: {dem.shape}, dtype: {dem.dtype}, nodata: {profile.get('nodata', 'N/A')}")

    # Masquer nodata
    dem = dem.astype(np.float32)
    dem[dem == profile.get('nodata', -32768)] = np.nan

    # Générer dérivés
    print(f"\nGénération des dérivés...")

    print("1. Hillshade multidirectionnel")
    hillshade = compute_hillshade(dem, resolution=0.5)  # Résolution MNT 0,5 m (approximatif après reprojection)
    save_layer(hillshade, DATA_DIR / "hillshade.tif", profile)

    print("2. Sky-View Factor")
    svf = compute_svf(dem, radius=10)
    svf = (svf * 255).astype(np.uint8)
    save_layer(svf, DATA_DIR / "svf.tif", profile)

    print("3. Local Relief Model")
    lrm = compute_lrm(dem, sigma=10)
    lrm = (lrm * 255).astype(np.uint8)
    save_layer(lrm, DATA_DIR / "lrm.tif", profile)

    print("4. Openness")
    openness = compute_openness(dem, radius=10)
    openness = ((openness + 1) * 127.5).astype(np.uint8)
    save_layer(openness, DATA_DIR / "openness.tif", profile)

    print(f"\n✓ Pipeline étape 2 terminée")
    print(f"  Dérivés générés: 4 couches")

    return 0

if __name__ == "__main__":
    # Afficher l'avertissement sur rvt-py
    if HAS_RVT:
        print("ℹ  rvt-py trouvé (utilisé pour SVF, LRM, openness)")
    else:
        print("⚠️  rvt-py non trouvé → implémentations numpy (moins précises)")

    sys.exit(main())
