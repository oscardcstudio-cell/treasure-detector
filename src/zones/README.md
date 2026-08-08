# src/zones — Zones signalées (monuments historiques, ZPPA, périmètres de protection)

Affichage des zones non prospectables ou à restrictions réglementaires. Drapeau avertissement avant creusage, jamais bloquant.

## État des données (2026-08-08)

**API sources testées** :
- ❌ `data.culture.gouv.fr` (API Explore v2.1) → SPA, pas d'API REST directe accessible
- ❌ `data.geopf.fr` WFS (Géoplateforme) → 801 couches listées, zéro résultat pour patrimoine/archéologie

**Verdict** : Aucune source API n'expose directement les monuments historiques (Mérimée) ou ZPPA sur Armous-et-Cau.

**Voie par défaut** : Export manuel via interface web (plan B documenté dans `docs/zone/SOURCES.md` §7).

---

## Procédure d'import manuel

### 1. Accès à Atlas des patrimoines

- URL : https://atlas.patrimoines.culture.fr/
- Filtrer par commune : Armous-et-Cau (INSEE 32009)
- Couches disponibles : Monuments historiques (MH), Périmètres, ZPPA, sites classés

### 2. Export des entités

**Option A — Export via interface web** (recommandé)
1. Sur la carte, sélectionner chaque entité manuellement
2. Télécharger en GeoJSON ou GeoCSV
3. Convertir en GeoJSON si nécessaire

**Option B — Extraction depuis le browser DevTools** (si WFS disponible)
1. Ouvrir l'inspecteur réseau (F12)
2. Identifier les appels à un service WFS/WMS interne
3. Construire la requête GetFeature manuellement

### 3. Structure attendue

Le fichier doit être sauvegardé en `data/derived/zones_signalees.geojson` :

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point" | "Polygon" | "MultiPolygon",
        "coordinates": [lon, lat] | [[[lon, lat], ...]]
      },
      "properties": {
        "name": "Nom du site",
        "kind": "MH" | "perimetre" | "ZPPA" | "site_classe" | "autre",
        "source": "Atlas des patrimoines (2026-08)",
        "ref": "référence optionnelle (ex. PA00094123)",
        "description": "description optionnelle"
      }
    }
  ]
}
```

### 4. Champ `kind` — Légende

| Valeur | Sens | Implication scoring |
|--------|------|---|
| `MH` | Monument historique classé ou inscrit | Avertissement avant creusage |
| `perimetre` | Périmètre de protection autour MH | Aucun creusage possible |
| `ZPPA` | Zone de Présomption de Prescriptions Archéologiques | Drapeau prudence, passage archéo possible |
| `site_classe` | Site classé ou inscrit | Aucun creusage possible |
| `autre` | Autre type de restriction | Avertissement discret |

### 5. Validation

Après ajout du fichier :

```bash
# Vérifier la structure GeoJSON
node -e "console.log(JSON.parse(require('fs').readFileSync('data/derived/zones_signalees.geojson')).features.length, 'zones');"

# Lancer les tests
npm run test -- src/zones
```

### 6. Intégration dans l'app

Une fois le fichier présent, la couche se charge automatiquement :

```tsx
<ZonesLayer map={map} isVisible={true} />
```

**Comportement de charge** :
- Fichier présent → couche affichée, popup au tap
- Fichier absent → couche vide, log informatif console (pas d'erreur UI)
- Erreur parsing → erreur console, couche vide

---

## API du module

### `ZonesLayer` (composant React)

```tsx
<ZonesLayer
  map={mapLibreInstance}
  isVisible={true}
  onVisibilityChange={(visible) => {}}
/>
```

**Props** :
- `map` : instance MapLibre GL
- `isVisible` : affiche/masque les couches (défaut: true)
- `onVisibilityChange` : callback visibilité toggle

**Couches générées** :
- `zones-signalees-fill` : remplissage orange semi-transparent
- `zones-signalees-outline` : contour orange pointillé 2px

### `loadSignaledZones()` (fonction)

```ts
const geojson = await loadSignaledZones();
// → SignaledZonesGeoJSON (structure validée)
```

**Gestion erreur** :
- Fichier 404 → log info, retourne FeatureCollection vide
- Autre erreur → log error, lance exception
- Parsing GeoJSON invalide → exception

### `filterZonesByKind()` (fonction)

```ts
const mhOnly = filterZonesByKind(geojson, 'MH');
const restricted = filterZonesByKind(geojson, ['perimetre', 'site_classe']);
```

### `knownSitesForValidation()` (fonction)

```ts
const sites = await knownSitesForValidation();
// → Array<{ name, coord: [lon, lat], kind }>
```

Utilisée par le scoring (T3.3) pour extraire les sites connus comme jeu de validation.

---

## Intégration scoring (T3.3, T3.4)

Les zones signalées alimentent le scoring à deux niveaux :

1. **Avant creusage** : Drapeau warning si DigPoint est dans une ZPPA ou périmètre
2. **Validation** : Sites de référence (MH + sites classés) pour calibrer la sensibilité du preset

Pas de blocage : le creusage reste possible, c'est une information pour l'utilisateur.

---

## Notes pour la suite

- **T3.1** : Pipeline de données — calage cadastre napoléonien + éventuellement conversion Mérimée si API ouverte
- **T3.2** : Calibrage presets — utiliser `knownSitesForValidation()` pour générer une fourchette de sensibilité
- **T3.3** : Scoring — intégrer le drapeau ZPPA/perimetre dans la pondération
- **T4.2** : Vérification intégration — vérifier le toggle et les popups sur la preview Railway

---

**Responsable lot** : T3.4 (Agent)
**Statut données** : [À VÉRIFIER — export manuel en cours]
