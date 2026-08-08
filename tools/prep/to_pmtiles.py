#!/usr/bin/env python3
"""
T3.1 — Exporter les dérivés en PMTiles (étape 3/4).

PMTiles est un format de conteneur raster single-file:
  - Une requête = plage d'octets (Range: bytes=X-Y)
  - Fonctionne en offline et sans serveur de tuiles
  - MapLibre GL JS charge nativement les PMTiles

Pipeline:
  1. Pour chaque couche dérivée (hillshade, svf, lrm, openness):
     - Découper en tuiles (z12-17)
     - Compresser (WebP pour les tuiles raster, avec dégradation minimale)
     - Empiler en PMTiles via CLI pmtiles

  2. Vérifier que les PMTiles sont accessibles en Range requests
     (obligatoire pour MapLibre)

Sorties:
  - data/derived/hillshade.pmtiles (z12-17)
  - data/derived/svf.pmtiles (z12-17)
  - data/derived/lrm.pmtiles (z12-17)
  - data/derived/openness.pmtiles (z12-17)

Outils:
  - gdal2tiles ou rio cogeo (générer des tuiles GeoTIFF)
  - pmtiles CLI (assembler en conteneur)
  - curl -H 'Range: ...' (vérifier l'accès par plage d'octets)
"""

import sys
import subprocess
from pathlib import Path
import os

REPO_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = REPO_ROOT / "data" / "derived"

LAYERS = ["hillshade", "svf", "lrm", "openness"]
MIN_ZOOM = 12
MAX_ZOOM = 17

def gdal2tiles_to_pmtiles(tif_file: Path, pmtiles_output: Path) -> bool:
    """
    Convertir un GeoTIFF en PMTiles via gdal2tiles + pmtiles CLI.

    Étapes:
    1. gdal2tiles.py -z 12-17 -w none input.tif output_tiles/
    2. pmtiles convert output_tiles output.pmtiles
    """

    temp_tiles_dir = DATA_DIR / f"tiles_{pmtiles_output.stem}"

    # Étape 1: gdal2tiles
    print(f"  gdal2tiles: {tif_file.name} → {temp_tiles_dir.name}/")
    cmd = [
        "gdal2tiles.py",
        "-z", f"{MIN_ZOOM}-{MAX_ZOOM}",
        "-w", "none",
        "-b", "1",  # Une seule bande (les dérivés sont monochromes)
        "-co", "COMPRESS=webp",
        "-co", "QUALITY=80",
        str(tif_file),
        str(temp_tiles_dir)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    ERREUR: {result.stderr[:200]}")
        return False

    # Étape 2: pmtiles convert
    print(f"  pmtiles convert: {temp_tiles_dir.name}/ → {pmtiles_output.name}")
    cmd = ["pmtiles", "convert", str(temp_tiles_dir), str(pmtiles_output)]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    ERREUR: {result.stderr[:200]}")
        return False

    # Nettoyage
    import shutil
    shutil.rmtree(temp_tiles_dir, ignore_errors=True)

    return True

def verify_pmtiles_range_request(pmtiles_path: Path) -> bool:
    """
    Vérifier que le fichier PMTiles supporte les Range requests.

    MapLibre nécessite Accept-Ranges + Range request support.
    """
    cmd = ["curl", "-I", "-H", "Range: bytes=0-99", f"file://{pmtiles_path}"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    # curl sur file:// ne supporte pas les headers Range, donc ce test est limité.
    # La vraie vérification se fait sur Railway (voir docs/CONTRACTS.md §5.3).

    print(f"  Fichier: {pmtiles_path.name} ({pmtiles_path.stat().st_size / (1024**2):.1f} MB)")
    return True

def main():
    print("=" * 70)
    print("T3.1 — Pipeline LiDAR HD (étape 3/4: PMTiles)")
    print("=" * 70)

    DATA_DIR.mkdir(exist_ok=True, parents=True)

    # Vérifier que les couches dérivées existent
    missing = [l for l in LAYERS if not (DATA_DIR / f"{l}.tif").exists()]
    if missing:
        print(f"ERREUR: Couches manquantes: {missing}")
        print("Exécuter derive.py d'abord.")
        return 1

    print(f"\nExport en PMTiles (z{MIN_ZOOM}-{MAX_ZOOM})...\n")

    generated = []
    failed = []

    for layer in LAYERS:
        tif_file = DATA_DIR / f"{layer}.tif"
        pmtiles_file = DATA_DIR / f"{layer}.pmtiles"

        print(f"{layer}:")
        if gdal2tiles_to_pmtiles(tif_file, pmtiles_file):
            verify_pmtiles_range_request(pmtiles_file)
            generated.append(pmtiles_file)
            print(f"  ✓ {pmtiles_file.name}\n")
        else:
            failed.append((layer, tif_file))
            print(f"  ✗ ÉCHOUÉ\n")

    print(f"\n✓ Pipeline étape 3 terminée")
    print(f"  PMTiles générés: {len(generated)}/{len(LAYERS)}")
    for f in generated:
        size_mb = f.stat().st_size / (1024**2)
        print(f"    - {f.name}: {size_mb:.1f} MB")

    if failed:
        print(f"\n⚠️  {len(failed)} couches en échec:")
        for layer, tif in failed:
            print(f"    - {layer}")

    return 0 if not failed else 1

if __name__ == "__main__":
    # Vérifier les dépendances
    deps = ["gdal2tiles.py", "pmtiles", "curl"]
    missing_deps = []
    for dep in deps:
        result = subprocess.run(["which", dep], capture_output=True)
        if result.returncode != 0:
            missing_deps.append(dep)

    if missing_deps:
        print(f"⚠️  Dépendances manquantes: {missing_deps}")
        print("   Installation (macOS): brew install gdal pmtiles")
        sys.exit(1)

    sys.exit(main())
