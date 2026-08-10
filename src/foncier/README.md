# src/foncier — Foncier (public / privé sous autorisation / exclu)

Distingue les parcelles où prospecter sans démarche lourde (voie, forêt publique ONF) de celles nécessitant l'accord du propriétaire (bois privé, terre agricole) ou totalement exclues (bâti). Indicatif, jamais une autorisation de fait — voir `LegalBanner`.

## Sources (vérifiées 2026-08-10)

| Source | Contenu | Endpoint |
|---|---|---|
| PCI Vecteur Etalab | Parcelles + bâtiments (fichiers séparés), commune Armous-et-Cau (INSEE 32009) | `https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/32/32009/cadastre-32009-{batiments,parcelles}.json.gz` |
| BD TOPO (WFS IGN) | `BDTOPO_V3:foret_publique` — domaniale/communale/ONF | `https://data.geopf.fr/wfs/ows` |
| BD TOPO (WFS IGN) | `BDTOPO_V3:troncon_de_route` — champ `prive` (bool), `nature`, `acces_pieton` | idem |

**Gotcha vérifié** : le BBOX du WFS `data.geopf.fr` attend l'ordre **lat,lon** (axe ISO de l'EPSG:4326) — l'ordre lon,lat renvoie 0 résultat sans erreur, silencieux et donc dangereux.

Aucune de ces sources ne donne l'identité du propriétaire (RGPD) — seulement le type de foncier.

## Génération des données

```bash
cd tools/prep
source .venv/bin/activate  # ou .venv/Scripts/activate sur Windows
python foncier.py
```

Sortie : `public/data/derived/foncier.geojson` (parcelles classifiées) et `public/data/derived/voies.geojson` (tronçons de route/chemin). Emprise : `config/zone.json` → `lidarBbox` (commune + marge immédiate), pas `bbox` (marge ~11 km, hors sujet pour "où marcher").

## Classification (`FoncierKind`)

| Valeur | Sens | Couleur |
|---|---|---|
| `bati` | Parcelle bâtie — exclue sans discussion | rouge |
| `foret_publique` | Forêt domaniale/communale/ONF — accès généralement toléré | vert |
| `prive_autorisation` | Défaut : bois privé, terre agricole, lande — accord du propriétaire requis | orange |

Tronçons de voie (`VoieFeature`) : vert si `prive === false`, rouge si `prive === true`.

## Intégration

```tsx
<FoncierLayer map={map} isVisible={showFoncierLayer} />
{showFoncierLayer && <LegalBanner />}
```

Comportement de charge identique à `src/zones` : fichier absent → couche vide + log info, jamais d'erreur qui casse le montage de la carte.

## Notes pour la suite

- **T3.2** (roadmap existante) prévoyait déjà une vectorisation BD TOPO chemins — ce module la couvre pour les tronçons de voie.
- Reste hors scope volontairement : RPG (parcelles agricoles déclarées) pour affiner `prive_autorisation` en distinguant culture/prairie/friche — cf. `docs/PLAN.md` §4, déjà prévu pour la fenêtre de sortie (§9.3), pas pour le foncier.
