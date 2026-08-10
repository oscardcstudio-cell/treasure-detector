"""
foncier.py — Classification foncier (accès public / privé sous autorisation / exclu)

Sources (vérifiées 2026-08-10, cf. docs/PLAN.md §4) :
- PCI Vecteur Etalab (cadastre.data.gouv.fr) : parcelles + bâtiments, GeoJSON par commune
- BD TOPO via WFS data.geopf.fr : BDTOPO_V3:foret_publique, BDTOPO_V3:troncon_de_route

Sortie :
- public/data/derived/foncier.geojson   (parcelles cadastrales classifiées, polygones)
- public/data/derived/voies.geojson     (tronçons de route/chemin, champ `prive`)

Gotcha vérifié : le BBOX du WFS data.geopf.fr attend l'ordre lat,lon (axe ISO
de l'EPSG:4326), pas lon,lat — l'ordre lon,lat renvoie 0 résultat SANS erreur.
"""

import gzip
import json
import sys
from pathlib import Path

import requests
from shapely.geometry import mapping, shape
from shapely.ops import unary_union


def drop_z(geometry: dict) -> dict:
    """WFS renvoie du XYZ (altitude) — inutile pour un rendu 2D, gonfle le fichier d'1/3."""

    def strip(coords):
        if isinstance(coords[0], (int, float)):
            return coords[:2]
        return [strip(c) for c in coords]

    return {**geometry, "coordinates": strip(geometry["coordinates"])}

ROOT = Path(__file__).resolve().parents[2]
ZONE_CONFIG = json.loads((ROOT / "config" / "zone.json").read_text(encoding="utf-8"))
# data/derived/ = source versionnée (*.geojson trackés, cf. .gitignore) ;
# public/data/derived/ est régénéré depuis ici par predev/prebuild (package.json).
OUT_DIR = ROOT / "data" / "derived"

INSEE = ZONE_CONFIG["insee"]
DEPT = INSEE[:2]
# lidarBbox (commune + marge immédiate ~2 km), pas bbox (~11 km de marge,
# cf. zone.json) : la couche foncier sert à savoir où marcher autour de la
# zone de prospection, pas à couvrir tout l'environnement lointain.
BBOX = ZONE_CONFIG["lidarBbox"]  # [minLon, minLat, maxLon, maxLat]

CADASTRE_URL = (
    "https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/"
    "communes/{dept}/{insee}/cadastre-{insee}-{layer}.json.gz"
)
WFS_URL = "https://data.geopf.fr/wfs/ows"


def fetch_cadastre(layer: str) -> dict:
    url = CADASTRE_URL.format(dept=DEPT, insee=INSEE, layer=layer)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return json.loads(gzip.decompress(resp.content))


def fetch_wfs(typename: str) -> dict:
    min_lon, min_lat, max_lon, max_lat = BBOX
    features = []
    start = 0
    count = 1000
    while True:
        params = {
            "SERVICE": "WFS",
            "VERSION": "2.0.0",
            "REQUEST": "GetFeature",
            "TYPENAMES": typename,
            "BBOX": f"{min_lat},{min_lon},{max_lat},{max_lon}",
            "OUTPUTFORMAT": "application/json",
            "COUNT": count,
            "STARTINDEX": start,
        }
        resp = requests.get(WFS_URL, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("features", [])
        features.extend(batch)
        if len(batch) < count:
            break
        start += count
    return {"type": "FeatureCollection", "features": features}


def classify_parcelles(parcelles: dict, batiments: dict, foret_publique: dict) -> dict:
    """
    3 niveaux, cf. docs/PLAN.md §4 :
    - bati              → parcelle bâtie, exclue sans discussion
    - foret_publique    → domaniale/communale/ONF, accès généralement toléré
    - prive_autorisation → défaut : bois privé, terre agricole, lande — accord
      du propriétaire requis, aucune source publique ne donne son identité.
    """
    bati_union = (
        unary_union([shape(f["geometry"]) for f in batiments["features"]])
        if batiments["features"]
        else None
    )
    foret_union = (
        unary_union([shape(f["geometry"]) for f in foret_publique["features"]])
        if foret_publique["features"]
        else None
    )

    out_features = []
    counts = {"bati": 0, "foret_publique": 0, "prive_autorisation": 0}
    for f in parcelles["features"]:
        geom = shape(f["geometry"])
        if bati_union is not None and geom.intersects(bati_union):
            kind = "bati"
        elif foret_union is not None and geom.intersects(foret_union):
            kind = "foret_publique"
        else:
            kind = "prive_autorisation"
        counts[kind] += 1
        props = f.get("properties", {})
        out_features.append(
            {
                "type": "Feature",
                "geometry": mapping(geom),
                "properties": {
                    "kind": kind,
                    "section": props.get("section"),
                    "numero": props.get("numero"),
                    "contenance": props.get("contenance"),
                    "source": "cadastre.data.gouv.fr (PCI Vecteur Etalab) + BDTOPO_V3:foret_publique (IGN)",
                },
            }
        )
    print(f"Parcelles classées : {counts}", file=sys.stderr)
    return {"type": "FeatureCollection", "features": out_features}


def build_voies(troncons: dict) -> dict:
    out_features = []
    for f in troncons["features"]:
        props = f.get("properties", {})
        out_features.append(
            {
                "type": "Feature",
                "geometry": drop_z(f["geometry"]),
                "properties": {
                    "nature": props.get("nature"),
                    "prive": props.get("prive"),
                    "acces_pieton": props.get("acces_pieton"),
                    "acces_vehicule_leger": props.get("acces_vehicule_leger"),
                    "nom": props.get("nom_collaboratif_gauche") or props.get("nom_collaboratif_droite"),
                    "source": "BDTOPO_V3:troncon_de_route (IGN, WFS data.geopf.fr)",
                },
            }
        )
    return {"type": "FeatureCollection", "features": out_features}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Commune {ZONE_CONFIG['name']} (INSEE {INSEE})", file=sys.stderr)

    print("Téléchargement PCI vecteur (bâtiments)...", file=sys.stderr)
    batiments = fetch_cadastre("batiments")
    print(f"  {len(batiments['features'])} bâtiments", file=sys.stderr)

    print("Téléchargement PCI vecteur (parcelles)...", file=sys.stderr)
    parcelles = fetch_cadastre("parcelles")
    print(f"  {len(parcelles['features'])} parcelles", file=sys.stderr)

    print("Téléchargement WFS forêt publique...", file=sys.stderr)
    foret_publique = fetch_wfs("BDTOPO_V3:foret_publique")
    print(f"  {len(foret_publique['features'])} entités forêt publique", file=sys.stderr)

    print("Téléchargement WFS voies (tronçons de route)...", file=sys.stderr)
    troncons = fetch_wfs("BDTOPO_V3:troncon_de_route")
    print(f"  {len(troncons['features'])} tronçons", file=sys.stderr)

    print("Classification parcelles...", file=sys.stderr)
    foncier = classify_parcelles(parcelles, batiments, foret_publique)
    (OUT_DIR / "foncier.geojson").write_text(json.dumps(foncier), encoding="utf-8")
    print(f"-> {OUT_DIR / 'foncier.geojson'}", file=sys.stderr)

    voies = build_voies(troncons)
    (OUT_DIR / "voies.geojson").write_text(json.dumps(voies), encoding="utf-8")
    print(f"-> {OUT_DIR / 'voies.geojson'}", file=sys.stderr)


if __name__ == "__main__":
    main()
