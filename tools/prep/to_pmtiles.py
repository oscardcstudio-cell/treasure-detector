#!/usr/bin/env python3
"""
T3.1 — Export PMTiles des dérivés LiDAR (étape 3/3).

Entrée : data/derived/{hillshade,svf,lrm,openness}.tif (uint8, EPSG:3857).
Sortie : data/derived/{...}.pmtiles (PNG niveaux de gris + alpha, z11–17).

Pur Python (pas de gdal2tiles ni de binaire pmtiles) :
  - découpage XYZ via mercantile + lectures fenêtrées rasterio (boundless)
  - encodage PNG via Pillow (mode LA : gris + alpha, nodata=0 → transparent)
  - conteneur via pmtiles.writer (tuiles écrites triées par tileid — requis
    par le format, le writer ne trie pas lui-même)

Publication : GitHub Release (jamais dans git — repo public, artefacts lourds).
"""

import sys
from io import BytesIO
from pathlib import Path

import mercantile
import numpy as np
import rasterio
from PIL import Image
from pmtiles.tile import Compression, TileType, zxy_to_tileid
from pmtiles.writer import Writer
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds as window_from_bounds
from tqdm import tqdm

REPO_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = REPO_ROOT / "data" / "derived"

LAYERS = ("hillshade", "svf", "lrm", "openness")
MIN_ZOOM, MAX_ZOOM = 11, 17
TILE_SIZE = 256


def render_tile(src, tile):
    """Lire la fenêtre du raster couvrant la tuile → PNG LA, None si vide."""
    xb = mercantile.xy_bounds(tile)
    window = window_from_bounds(xb.left, xb.bottom, xb.right, xb.top,
                                transform=src.transform)
    data = src.read(1, window=window, out_shape=(TILE_SIZE, TILE_SIZE),
                    boundless=True, fill_value=0, resampling=Resampling.bilinear)
    if not data.any():
        return None
    alpha = np.where(data == 0, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([data, alpha]), mode="LA")
    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def build_pmtiles(layer):
    tif = DATA_DIR / f"{layer}.tif"
    if not tif.exists():
        print(f"  ! {tif.name} absent — exécuter derive.py d'abord.")
        return None
    out = DATA_DIR / f"{layer}.pmtiles"

    with rasterio.open(tif) as src:
        w, s, e, n = transform_bounds(src.crs, "EPSG:4326", *src.bounds)
        jobs = []
        for z in range(MIN_ZOOM, MAX_ZOOM + 1):
            for t in mercantile.tiles(w, s, e, n, [z]):
                jobs.append((zxy_to_tileid(t.z, t.x, t.y), t))
        jobs.sort(key=lambda j: j[0])  # ordre tileid requis par le format

        written = 0
        with open(out, "wb") as f:
            writer = Writer(f)
            for tileid, t in tqdm(jobs, desc=layer, leave=False):
                png = render_tile(src, t)
                if png:
                    writer.write_tile(tileid, png)
                    written += 1
            header = {
                "tile_type": TileType.PNG,
                "tile_compression": Compression.NONE,
                "min_zoom": MIN_ZOOM, "max_zoom": MAX_ZOOM,
                "min_lon_e7": int(w * 1e7), "min_lat_e7": int(s * 1e7),
                "max_lon_e7": int(e * 1e7), "max_lat_e7": int(n * 1e7),
                "center_zoom": 14,
                "center_lon_e7": int((w + e) / 2 * 1e7),
                "center_lat_e7": int((s + n) / 2 * 1e7),
            }
            metadata = {"name": f"lidar-{layer}", "attribution": "IGN LiDAR HD",
                        "format": "png"}
            writer.finalize(header, metadata)

    print(f"  ✓ {out.name}: {written} tuiles, {out.stat().st_size / 1e6:.1f} MB")
    return out


def main() -> int:
    outputs = [build_pmtiles(layer) for layer in LAYERS]
    if not all(outputs):
        return 1
    print("\nPublication : gh release create (voir README).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
