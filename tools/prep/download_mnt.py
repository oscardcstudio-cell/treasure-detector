#!/usr/bin/env python3
"""
T3.1 — Télécharger les dalles MNT LiDAR HD (0,5 m) couvrant la zone.

Pipeline :
  1. Charger config/zone.json (bbox en WGS84)
  2. Découvrir les dalles couvrant la bbox auprès de la géoplateforme IGN
  3. Télécharger chaque dalle COPC.LAZ avec reprise
  4. Assembler en mosaïque VRT (EPSG:2154)
  5. Exporter statistics (gdalinfo)

NOTE: Machine locale uniquement. Le proxy bloc data.geopf.fr depuis les conteneurs.
      Commande obligatoire: curl -4 (IPv6 bloqué sur la machine).

Références:
  - Géoplateforme: https://data.geopf.fr/
  - Découverte des dalles: WFS GetCapabilities, ou interface interactive.
  - MNT LiDAR HD: COPC.LAZ, 1 km × 1 km, ~200 Mo, EPSG:2154 (Lambert-93)

Sortie:
  - data/derived/mnt_lidar_raw.vrt (mosaïque VRT non reprojetée)
  - data/derived/mnt_lidar_mosaic.tif (VRT en mémoire, reprojection à la demande)
  - logs/download_mnt.txt (liste des dalles téléchargées, tailles, URLs testées)
"""

import json
import os
import sys
import subprocess
import tempfile
from pathlib import Path
from typing import List, Tuple
from datetime import datetime

import requests
from tqdm import tqdm

# Configuration
REPO_ROOT = Path(__file__).parent.parent.parent
CONFIG_FILE = REPO_ROOT / "config" / "zone.json"
DATA_DIR = REPO_ROOT / "data" / "derived"
LOGS_DIR = REPO_ROOT / "tools" / "prep" / "logs"
TEMP_DIR = tempfile.mkdtemp(prefix="lidar_")

# Endpoints IGN (à mettre à jour selon la disponibilité)
# Optiopn A: WFS GetCapabilities pour les emprises (non testé depuis le conteneur)
WFS_URL = "https://data.geopf.fr/private/wfs"
# Option B: Interface de diffusion directe (chemins stables)
# Les dalles LiDAR HD sont généralement à: https://data.geopf.fr/telechargement/<année>/mnt/
# Exemple: https://data.geopf.fr/telechargement/2025/mnt/COPC/<dalleID>.laz

# Pour cette session, on va découvrir les dalles manuellement via le catalogue Cartes.gouv
# et les télécharger par URL stable.

def load_zone_config():
    """Charger bbox et metadata de config/zone.json"""
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(f"Config non trouvée: {CONFIG_FILE}")
    with open(CONFIG_FILE) as f:
        return json.load(f)

def bbox_to_lambda93_tiles(bbox_wgs84: List[float]) -> List[str]:
    """
    Convertir une bbox WGS84 en liste de dalles Lambert-93 couverts.

    bbox_wgs84: [west, south, east, north] en WGS84
    Retour: liste de noms de dalles (ex. ['00_0', '00_1', ...])

    NOTE: Pour le Gers, la couverture LiDAR HD est partielle (À VÉRIFIER).
          En cas d'absence, basculer sur RGE ALTI 1 m (EPSG:2154).
    """
    # Conversion WGS84 → Lambert-93 (EPSG:2154)
    # Formule approximée pour le sud-ouest français:
    # Les dalles LiDAR sont indexées par leur coin SO en Lambert-93 (1 km × 1 km)
    # Grille: (E in [2600..3000] × 10^3 m) × (N in [1700..2100] × 10^3 m)

    import pyproj
    proj_4326 = pyproj.Proj(init='epsg:4326')
    proj_2154 = pyproj.Proj(init='epsg:2154')

    # Convertir les coins de la bbox
    west, south, east, north = bbox_wgs84
    so_2154 = pyproj.transform(proj_4326, proj_2154, west, south)
    ne_2154 = pyproj.transform(proj_4326, proj_2154, east, north)

    e_min, n_min = int(so_2154[0] / 1000) * 1000, int(so_2154[1] / 1000) * 1000
    e_max, n_max = int(ne_2154[0] / 1000 + 1) * 1000, int(ne_2154[1] / 1000 + 1) * 1000

    tiles = []
    for e in range(e_min, e_max + 1, 1000):
        for n in range(n_min, n_max + 1, 1000):
            # Format dalle: "XXXXXX_XXXXXX" (coordonnées Lambert-93)
            tile_id = f"{e//1000:02d}_{n//1000:02d}"
            tiles.append(tile_id)

    return tiles

def discover_tiles_cartes_gouv() -> List[Tuple[str, str]]:
    """
    Découvrir les dalles LiDAR HD via le catalogue Cartes.gouv.

    Retour: [(nom_dalle, url_telechargement), ...]

    TODO: Implémenter le parsing de cartes.gouv ou fournir une liste manuelle.
    Pour cette phase, on va documenter les URLs réelles testées.
    """
    # Placeholder: à remplir avec la vraie découverte ou une liste codée.
    # Pour Armous-et-Cau, le Gers n'est couvert QUE si la couverture HD remonte à 2026.
    # Carte de suivi: macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD

    print("[ATTENTE] Découverte des dalles MNT LiDAR HD pour le Gers...")
    print("  Carte de suivi: https://macarte.ign.fr/carte/mThSup/diffusionMNxLiDARHD")
    print("  À VÉRIFIER: le Gers est-il couvert en fin 2025 ? (taux couverture métro ~80%)")
    print("  Repli: RGE ALTI 1 m si absent.")

    # Pour cette session:
    # - Si non couvert → retour []
    # - Si couvert → URLs à documenter par curl -4 réel

    return []

def download_tiles(tile_urls: List[Tuple[str, str]], max_retries: int = 3):
    """
    Télécharger les dalles COPC.LAZ avec reprise.

    Utiliser curl -4 (IPv6 bloqué sur Mac).
    """
    LOGS_DIR.mkdir(exist_ok=True, parents=True)
    log_file = LOGS_DIR / "download_mnt.txt"

    downloaded = []
    failed = []

    with open(log_file, 'w') as log:
        log.write(f"Session téléchargement MNT LiDAR HD — {datetime.now().isoformat()}\n")
        log.write(f"Zone: {CONFIG_FILE.name}\n")
        log.write(f"Répertoire temp: {TEMP_DIR}\n\n")

        for tile_name, url in tqdm(tile_urls, desc="Dalles"):
            local_path = Path(TEMP_DIR) / f"{tile_name}.laz"

            # Essayer le téléchargement avec curl -4
            for attempt in range(max_retries):
                cmd = [
                    "curl", "-4", "-L", "-C", "-",  # IPv4 forcé, suivi redirects, resume
                    "-o", str(local_path),
                    url
                ]
                try:
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                    if result.returncode == 0:
                        size = local_path.stat().st_size / (1024**2)
                        log.write(f"✓ {tile_name:12s} → {size:7.1f} MB ({url})\n")
                        downloaded.append((tile_name, local_path, size))
                        break
                    else:
                        log.write(f"✗ {tile_name:12s} attempt {attempt+1}/{max_retries}: "
                                f"curl RC={result.returncode}, stderr={result.stderr[:100]}\n")
                except subprocess.TimeoutExpired:
                    log.write(f"✗ {tile_name:12s} attempt {attempt+1}/{max_retries}: timeout\n")
            else:
                # Tous les essais échoués
                failed.append((tile_name, url))
                log.write(f"✗ {tile_name:12s} — DROPPED après {max_retries} tentatives\n")

        log.write(f"\nRésumé:\n")
        log.write(f"  Succès: {len(downloaded)} dalles\n")
        log.write(f"  Échecs: {len(failed)} dalles\n")
        total_mb = sum(s for _, _, s in downloaded)
        log.write(f"  Volume total: {total_mb:.1f} MB\n")

    print(f"\nLog écrit: {log_file}")
    return downloaded, failed

def create_mosaic_vrt(downloaded: List[Tuple[str, Path, float]]):
    """
    Créer une VRT (Virtual Raster Mosaic) en EPSG:2154.

    Entrée: liste de fichiers LAZ téléchargés
    Sortie: data/derived/mnt_lidar_raw.vrt (mosaïque non reprojetée)
    """
    if not downloaded:
        print("Aucune dalle téléchargée. Arrêt.")
        return None

    DATA_DIR.mkdir(exist_ok=True, parents=True)
    vrt_path = DATA_DIR / "mnt_lidar_raw.vrt"

    # Utiliser gdalbuildvrt
    laz_files = [str(path) for _, path, _ in downloaded]
    cmd = ["gdalbuildvrt", "-q", str(vrt_path)] + laz_files

    print(f"Création VRT: {cmd}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERREUR gdalbuildvrt: {result.stderr}")
        return None

    # Afficher gdalinfo
    print(f"\nInfo mosaïque (gdalinfo):")
    result = subprocess.run(["gdalinfo", str(vrt_path)], capture_output=True, text=True)
    print(result.stdout[:1000])  # Premiers 1000 chars

    return vrt_path

def main():
    print("=" * 70)
    print("T3.1 — Pipeline LiDAR HD (étape 1/4: téléchargement des dalles)")
    print("=" * 70)

    zone = load_zone_config()
    print(f"\nZone: {zone.get('name', 'unknown')}")
    print(f"  Bbox (WGS84): {zone['bbox']}")
    print(f"  INSEE: {zone.get('insee', 'N/A')}")

    # Découvrir les dalles
    tiles = discover_tiles_cartes_gouv()

    if not tiles:
        print("\n⚠️  Aucune dalle LiDAR HD découverte.")
        print("   Raisons possibles:")
        print("   - Gers non couvert en fin 2025 (taux métro: 80%)")
        print("   - Géoplateforme indisponible ou format de découverte non implémenté")
        print("\n   Prochaine étape: repli sur RGE ALTI 1 m (voir §4.2 du PLAN.md)")
        print("   (Non implémenté dans cette phase)")
        return 1

    print(f"\nDalles découvertes: {len(tiles)}")
    for name, url in tiles[:3]:
        print(f"  - {name}: {url[:60]}...")
    if len(tiles) > 3:
        print(f"  ... et {len(tiles)-3} autres")

    # Télécharger
    downloaded, failed = download_tiles(tiles)

    # Créer VRT
    vrt = create_mosaic_vrt(downloaded)

    print(f"\n✓ Pipeline étape 1 terminée")
    print(f"  Dalles téléchargées: {len(downloaded)}")
    print(f"  VRT: {vrt if vrt else 'N/A'}")

    return 0 if downloaded else 1

if __name__ == "__main__":
    sys.exit(main())
