#!/usr/bin/env python3
"""
T3.1 — Télécharger les dalles MNT LiDAR HD (0,5 m) couvrant la zone (étape 1/3).

Méthode réelle (vérifiée 2026-08-08, machine locale) :
  1. Charger config/zone.json → `lidarBbox` (WGS84), repli sur `bbox`.
  2. Découvrir les dalles via le WFS Géoplateforme, couche `IGNF_MNT-LIDAR-HD:dalle`.
     ATTENTION ordre des axes : BBOX en lat,lon + CRS urn:ogc:def:crs:EPSG::4326
     (l'ordre lon,lat renvoie silencieusement 0 dalle).
  3. Chaque feature porte une URL WMS-R GetMap `image/geotiff` (2000×2000 px,
     1 km², EPSG:2154) — PAS de COPC.LAZ à traiter, l'IGN sert le raster MNT.
  4. Télécharger via curl -4 (IPv6 cassé sur cette machine) avec reprise.
  5. Vérifier chaque dalle avec rasterio (pas de gdalinfo : GDAL CLI absent,
     pas de droits admin — tout le pipeline est pur Python).

Sortie:
  - data/derived/mnt_tiles/*.tif   (dalles MNT EPSG:2154, gitignorées)
  - tools/prep/logs/download_mnt.txt

La mosaïque n'est PAS construite ici (pas de gdalbuildvrt) : derive.py lit les
dalles directement via rasterio.merge sur des fenêtres tamponnées.
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).parent.parent.parent
CONFIG_FILE = REPO_ROOT / "config" / "zone.json"
TILES_DIR = REPO_ROOT / "data" / "derived" / "mnt_tiles"
LOGS_DIR = REPO_ROOT / "tools" / "prep" / "logs"

WFS_URL = "https://data.geopf.fr/wfs/ows"
WFS_LAYER = "IGNF_MNT-LIDAR-HD:dalle"


def load_zone_config() -> dict:
    with open(CONFIG_FILE) as f:
        return json.load(f)


def discover_tiles(bbox_wgs84: list) -> list:
    """Interroger la grille WFS des dalles MNT LiDAR HD → [(nom, url), ...]."""
    west, south, east, north = bbox_wgs84
    params = {
        "SERVICE": "WFS",
        "VERSION": "2.0.0",
        "REQUEST": "GetFeature",
        "TYPENAMES": WFS_LAYER,
        # lat,lon obligatoire avec le CRS urn (sinon 0 résultat, sans erreur)
        "BBOX": f"{south},{west},{north},{east},urn:ogc:def:crs:EPSG::4326",
        "OUTPUTFORMAT": "application/json",
        "COUNT": "1000",
    }
    r = requests.get(WFS_URL, params=params, timeout=120)
    r.raise_for_status()
    feats = r.json()["features"]
    return [(f["properties"]["name_download"], f["properties"]["url"]) for f in feats]


def download_tiles(tiles: list, max_retries: int = 3):
    """Télécharger chaque dalle GeoTIFF avec curl -4, reprise si déjà présente."""
    TILES_DIR.mkdir(exist_ok=True, parents=True)
    LOGS_DIR.mkdir(exist_ok=True, parents=True)
    log_file = LOGS_DIR / "download_mnt.txt"

    downloaded, failed = [], []
    with open(log_file, "w") as log:
        log.write(f"Session MNT LiDAR HD — {datetime.now().isoformat()}\n")
        log.write(f"Dalles découvertes: {len(tiles)}\n\n")
        for name, url in tiles:
            out = TILES_DIR / name
            if out.exists() and out.stat().st_size > 0:
                downloaded.append(out)
                log.write(f"= {name} (déjà présente)\n")
                continue
            ok = False
            for _ in range(max_retries):
                res = subprocess.run(
                    ["curl", "-4", "-sS", "-L", "--max-time", "180", "-o", str(out), url],
                    capture_output=True, text=True,
                )
                if res.returncode == 0 and out.exists() and out.stat().st_size > 0:
                    ok = True
                    break
            if ok:
                downloaded.append(out)
                log.write(f"+ {name} ({out.stat().st_size / 1e6:.1f} MB)\n")
            else:
                failed.append(name)
                log.write(f"! ECHEC {name}\n")
        log.write(f"\nSuccès: {len(downloaded)} / Échecs: {len(failed)}\n")
    return downloaded, failed


def verify_tiles(paths: list) -> int:
    """Ouvrir chaque dalle avec rasterio ; retirer les fichiers invalides."""
    import rasterio

    bad = 0
    for p in paths:
        try:
            with rasterio.open(p) as src:
                assert src.crs is not None and src.width == 2000
        except Exception:
            print(f"  dalle corrompue, supprimée: {p.name}")
            p.unlink(missing_ok=True)
            bad += 1
    return bad


def main() -> int:
    zone = load_zone_config()
    bbox = zone.get("lidarBbox") or zone["bbox"]
    print(f"Zone: {zone['name']} — bbox LiDAR {bbox}")

    tiles = discover_tiles(bbox)
    if not tiles:
        print("Aucune dalle MNT LiDAR HD sur cette emprise (couverture IGN ?).")
        return 1
    print(f"Dalles découvertes: {len(tiles)}")

    downloaded, failed = download_tiles(tiles)
    bad = verify_tiles(downloaded)
    print(f"Téléchargées: {len(downloaded) - bad} · échecs: {len(failed)} · corrompues: {bad}")
    return 0 if downloaded and not failed and not bad else 1


if __name__ == "__main__":
    sys.exit(main())
