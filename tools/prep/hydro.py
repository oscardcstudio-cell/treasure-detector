"""
hydro.py — Hydrographie (rivières, ruisseaux) pour le critère de scoring `proximity_source`

[MACHINE LOCALE] — ce script NE PEUT PAS tourner dans un conteneur d'agent :
le proxy egress bloque data.geopf.fr (cf. docs/PLAN.md, gotcha réseau du
2026-08-08 ; reconfirmé le 2026-08-11 — `curl -4 data.geopf.fr/wfs/ows` →
CONNECT tunnel failed, 403). À exécuter depuis la machine d'Oscar.

Source : BD TOPO via WFS data.geopf.fr, couche `BDTOPO_V3:troncon_hydrographique`
(réseau hydrographique linéaire IGN — cours d'eau, canaux, y compris
intermittents). Suit le même pattern que `foncier.py` (BBOX en lat,lon,
dédoublonnage par pagination STARTINDEX/COUNT).

[À VÉRIFIER] Les noms de champs `nature` et `regime` ci-dessous sont ceux
documentés dans le schéma public BD TOPO v3 (IGN) mais n'ont jamais été
vérifiés par un GetFeature réel sur cette zone (contrainte réseau ci-dessus) —
contrairement à `troncon_de_route`/`prive` dans foncier.py, vérifiés le
2026-08-10. Si un champ est absent de la réponse réelle, le script l'écrit à
`null` plutôt que de planter (`props.get(...)`) : à corriger au premier run
réel, pas de raison de bloquer dessus.

Sortie :
- data/derived/hydro_streams.geojson (LineString/MultiLineString)
  → active le critère `proximity_source` de config/scoring.json en repassant
    son `source.status` de "awaits_T3.1_vectorization" à "disponible"
    (changement manuel, volontairement pas automatique — cf. §0 du plan,
    aucun statut ne bascule sans preuve produite).
"""

import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
ZONE_CONFIG = json.loads((ROOT / "config" / "zone.json").read_text(encoding="utf-8"))
OUT_DIR = ROOT / "data" / "derived"

# lidarBbox (commune + ~2 km de marge), pas bbox (~11 km) : cohérent avec
# foncier.py — la couche sert à savoir où marcher autour de la zone de
# prospection, pas à couvrir tout l'environnement lointain.
BBOX = ZONE_CONFIG["lidarBbox"]  # [minLon, minLat, maxLon, maxLat]

WFS_URL = "https://data.geopf.fr/wfs/ows"
TYPENAME = "BDTOPO_V3:troncon_hydrographique"


def drop_z(geometry: dict) -> dict:
    """WFS renvoie du XYZ (altitude) — inutile pour un rendu 2D, gonfle le fichier d'1/3."""

    def strip(coords):
        if isinstance(coords[0], (int, float)):
            return coords[:2]
        return [strip(c) for c in coords]

    return {**geometry, "coordinates": strip(geometry["coordinates"])}


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


def build_hydro(troncons: dict) -> dict:
    out_features = []
    for f in troncons["features"]:
        props = f.get("properties", {})
        out_features.append(
            {
                "type": "Feature",
                "geometry": drop_z(f["geometry"]),
                "properties": {
                    "nature": props.get("nature"),
                    "regime": props.get("regime"),
                    "nom": props.get("nom_collaboratif_gauche") or props.get("nom_collaboratif_droite"),
                    "source": f"{TYPENAME} (IGN, WFS data.geopf.fr)",
                },
            }
        )
    return {"type": "FeatureCollection", "features": out_features}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Commune {ZONE_CONFIG['name']} (INSEE {ZONE_CONFIG['insee']})", file=sys.stderr)

    print(f"Téléchargement WFS hydrographie ({TYPENAME})...", file=sys.stderr)
    troncons = fetch_wfs(TYPENAME)
    print(f"  {len(troncons['features'])} tronçons hydrographiques", file=sys.stderr)

    hydro = build_hydro(troncons)
    (OUT_DIR / "hydro_streams.geojson").write_text(json.dumps(hydro), encoding="utf-8")
    print(f"-> {OUT_DIR / 'hydro_streams.geojson'}", file=sys.stderr)
    print(
        "Rappel : repasser le statut de `proximity_source` dans config/scoring.json "
        "à \"disponible\" une fois ce fichier vérifié (features non vides, géométrie plausible).",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
