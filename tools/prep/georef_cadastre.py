#!/usr/bin/env python3
"""
T3.1 — Squelette: géoréférencement du cadastre napoléonien (étape 4/4 — FUTURE).

Le cadastre napoléonien numérisé par AD32 n'est PAS géoréférencé.
Calage manuel requis via des **amers** (ground control points):
  - Angles d'église (tête de croix moderne vs plan ancien)
  - Carrefours de chemins visibles sur Cassini + état-major + ortho actuelle
  - Limites parcellaires pérennes (murets, fossés)

Workflow (non implémenté):
  1. Charger l'image raster du plan napoléonien (PNG/TIFF des AD)
  2. Identifier manuellement 5-10 GCP (Ground Control Points) sur l'image
  3. Convertir les coordonnées plan vers coordonnées terrain (WGS84)
  4. gdalwarp -gcp et -tps (thin plate spline) pour le calage
  5. Export en GeoTIFF (EPSG:4326) et PMTiles (z14-16)

Entrées attendues (à récupérer):
  - data/sources/cadastre_armous_cau_original.tif (scan des AD32)
  - Tableau GCP (points manuels: pixel_x, pixel_y → lon, lat)

Paramètres GDAL:
  - Minimum 3 GCP pour affine, 5+ pour TPS (meilleur résultat curvilinéaire)
  - Ordre de transformation: TPS = thin plate spline (adapté aux distorsions cartographiques)

Référence:
  - PLAN.md §4.4: « Point capital sur le cadastre napoléonien »
  - CONTRACTS.md: stockage en PMTiles, z14-16 (cadastre est un vecteur, pas du raster)
  - SOURCES.md (à compléter): procédure AD32, contacts, accès à distance
"""

import sys
from pathlib import Path
from typing import List, Tuple

REPO_ROOT = Path(__file__).parent.parent.parent
DATA_SOURCES = REPO_ROOT / "data" / "sources"
DATA_DERIVED = REPO_ROOT / "data" / "derived"

def load_ground_control_points(gcp_file: Path) -> List[Tuple[float, float, float, float]]:
    """
    Charger les Ground Control Points depuis un fichier CSV.

    Format: pixel_x,pixel_y,lon,lat (ligne d'en-tête skippée)
    Retour: [(px, py, lon, lat), ...]
    """
    # TODO
    pass

def georef_with_gdal_gcp(image_path: Path, gcps: List[Tuple[float, float, float, float]], output_path: Path) -> bool:
    """
    Appliquer le calage GCP via gdalwarp.

    gdalwarp -gcp px py lon lat ... -tps input.tif output.tif
    """
    # TODO: subprocess.run avec gdalwarp + -gcp pour chaque GCP
    pass

def main():
    print("=" * 70)
    print("T3.1 — Pipeline LiDAR HD (étape 4/4: cadastre napoléonien)")
    print("=" * 70)

    print("""
⚠️  Cadastre napoléonien: NON IMPLÉMENTÉ DANS CETTE PHASE

Raisons:
  1. Les scans haute résolution n'ont pas encore été téléchargés des AD32
  2. Le calage GCP est un travail manuel (5-10 points d'amers par plan)
  3. Nécessite de connaître les coordonnées précises des points d'amers modernes
     (ex: coin SO de l'église actuelle)

Prochaines étapes (T3.2 ou plus tard):
  - Contact AD32 pour accès à distance aux plans numérisés
  - Constituer un tableau d'amers visuels (carrefours, églises, bornes)
  - Implémenter georef_with_gdal_gcp() ci-dessus
  - Exporter en GeoTIFF + PMTiles (z14-16)

Références du projet:
  - PLAN.md §4.4 (sources humaines, archivage)
  - docs/zone/SOURCES.md (à remplir)
  - CONTRACTS.md (format de stockage)

Ressources:
  - AD Gers (Auch): https://www.gers.fr/
  - RFG Généalogie: https://www.rfgenealogie.com/infos/le-gers-met-en-ligne-de-nouveaux-cartes-et-plans
  - QGIS + plugin Georeferencer (alternative manuelle)
""")

    return 0

if __name__ == "__main__":
    sys.exit(main())
