#!/usr/bin/env python3
"""
T3.1 — Dérivés de visualisation archéo du MNT LiDAR HD (étape 2/3).

Entrée : data/derived/mnt_tiles/*.tif (dalles 1 km², 0,5 m, EPSG:2154).
Sortie : data/derived/{hillshade,svf,lrm,openness}.tif (uint8, EPSG:3857).

Tout en pur Python (rasterio + rvt-py Apache 2.0) — aucun binaire GDAL requis :
  - hillshade : moyenne de rvt.vis.multi_hillshade 8 azimuts, élévation 45°
  - svf       : rvt.vis.sky_view_factor (Zakšek et al. 2011), r_max 10 px (5 m)
  - lrm       : rvt.vis.slrm (Hesse 2010), rayon 40 px (20 m)
  - openness  : rvt.vis.sky_view_factor(compute_opns=True), openness positive

Stratégie mémoire : traitement dalle par dalle avec un tampon de 64 px lu chez
les voisines (rasterio.merge sur la fenêtre élargie) pour éviter les coutures,
puis mosaïque uint8 de chaque dérivé et reprojection EPSG:2154 → 3857 via
rasterio.warp. Jamais plus d'une dalle float32 en RAM.
"""

import sys
from pathlib import Path

import numpy as np
import rasterio
import rvt.vis
from rasterio.merge import merge as rio_merge
from rasterio.warp import calculate_default_transform, reproject, Resampling
from tqdm import tqdm

REPO_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = REPO_ROOT / "data" / "derived"
TILES_DIR = DATA_DIR / "mnt_tiles"

BUFFER_PX = 64          # > 2× le plus grand rayon d'analyse (40 px)
RES = 0.5               # m/px, MNT LiDAR HD
NODATA_IN = -9999.0

LAYERS = ("hillshade", "svf", "lrm", "openness")


def compute_derivatives(dem: np.ndarray) -> dict:
    """dem float32 (NaN = nodata) → 4 arrays float [0..1]."""
    hs = rvt.vis.multi_hillshade(dem, RES, RES, nr_directions=8, sun_elevation=45,
                                 no_data=np.nan)
    # multi_hillshade rogne 1 px de bord (vérifié) — repad NaN pour réaligner
    hillshade = np.pad(np.nanmean(hs, axis=0), 1, constant_values=np.nan)

    svf_out = rvt.vis.sky_view_factor(dem, RES, compute_svf=True, compute_opns=True,
                                      svf_n_dir=16, svf_r_max=10, no_data=np.nan)
    svf = svf_out["svf"]                          # [0..1]
    # openness positive en degrés, ~[55..95] utile → étirement standard archéo
    opns = np.clip((svf_out["opns"] - 55.0) / 40.0, 0, 1)

    lrm = rvt.vis.slrm(dem, radius_cell=40, no_data=np.nan)
    # LRM en mètres, centré sur 0 ; ±1 m couvre les micro-reliefs recherchés
    lrm = np.clip((lrm + 1.0) / 2.0, 0, 1)

    return {"hillshade": hillshade, "svf": svf, "lrm": lrm, "openness": opns}


def to_uint8(arr: np.ndarray) -> np.ndarray:
    """float [0..1] avec NaN → uint8, 0 réservé au nodata."""
    out = np.clip(np.nan_to_num(arr, nan=0.0), 0, 1) * 254 + 1
    out[np.isnan(arr)] = 0
    return out.astype(np.uint8)


def process_tiles(tile_paths: list):
    """Générer les 4 dérivés dalle par dalle (tampon lu chez les voisines)."""
    out_dirs = {}
    for layer in LAYERS:
        d = DATA_DIR / f"_{layer}_tiles"
        d.mkdir(exist_ok=True, parents=True)
        out_dirs[layer] = d

    srcs = [rasterio.open(p) for p in tile_paths]
    try:
        for p in tqdm(tile_paths, desc="Dalles"):
            with rasterio.open(p) as tile:
                b = tile.bounds
                buf = BUFFER_PX * RES
                window_bounds = (b.left - buf, b.bottom - buf, b.right + buf, b.top + buf)
                merged, transform = rio_merge(
                    srcs, bounds=window_bounds, res=(RES, RES), nodata=NODATA_IN)
                dem = merged[0].astype(np.float32)
                dem[dem == NODATA_IN] = np.nan

                derived = compute_derivatives(dem)

                profile = tile.profile.copy()
                profile.update(dtype="uint8", count=1, nodata=0,
                               compress="deflate", tiled=True,
                               blockxsize=512, blockysize=512)
                for layer, arr in derived.items():
                    core = to_uint8(arr[BUFFER_PX:-BUFFER_PX, BUFFER_PX:-BUFFER_PX])
                    out = out_dirs[layer] / p.name
                    with rasterio.open(out, "w", **profile) as dst:
                        dst.write(core, 1)
    finally:
        for s in srcs:
            s.close()
    return out_dirs


def mosaic_and_reproject(out_dirs: dict):
    """Mosaïque uint8 de chaque dérivé puis reprojection EPSG:2154 → 3857."""
    for layer in LAYERS:
        tile_files = sorted(out_dirs[layer].glob("*.tif"))
        srcs = [rasterio.open(p) for p in tile_files]
        try:
            merged, transform = rio_merge(srcs, nodata=0)
        finally:
            for s in srcs:
                s.close()

        h, w = merged.shape[1], merged.shape[2]
        src_crs = rasterio.crs.CRS.from_epsg(2154)
        src_bounds = rasterio.transform.array_bounds(h, w, transform)
        dst_transform, dst_w, dst_h = calculate_default_transform(
            src_crs, "EPSG:3857", w, h, *src_bounds)
        dst = np.zeros((dst_h, dst_w), dtype=np.uint8)
        reproject(
            source=merged[0], destination=dst,
            src_transform=transform, src_crs=src_crs,
            dst_transform=dst_transform, dst_crs="EPSG:3857",
            src_nodata=0, dst_nodata=0, resampling=Resampling.bilinear)

        out = DATA_DIR / f"{layer}.tif"
        profile = {
            "driver": "GTiff", "dtype": "uint8", "count": 1, "nodata": 0,
            "width": dst_w, "height": dst_h, "crs": "EPSG:3857",
            "transform": dst_transform, "compress": "deflate",
            "tiled": True, "blockxsize": 512, "blockysize": 512,
        }
        with rasterio.open(out, "w", **profile) as f:
            f.write(dst, 1)
        print(f"  ✓ {out.name} ({dst_w}×{dst_h}, {out.stat().st_size / 1e6:.0f} MB)")


def main() -> int:
    tile_paths = sorted(TILES_DIR.glob("*.tif"))
    if not tile_paths:
        print(f"Aucune dalle dans {TILES_DIR} — exécuter download_mnt.py d'abord.")
        return 1
    print(f"Dalles MNT: {len(tile_paths)}")

    out_dirs = process_tiles(tile_paths)
    print("Mosaïque + reprojection EPSG:3857...")
    mosaic_and_reproject(out_dirs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
