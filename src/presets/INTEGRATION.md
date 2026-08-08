# Preset Module — Points d'intégration

## Fichiers créés

- `config/presets.json` — Configuration des 8 profils du Garrett ACE 250 + mappings
- `src/presets/resolve.ts` — Moteur de sélection du preset basé sur ScoreCell
- `src/presets/PresetCard.tsx` — Composant d'affichage terrain (gros caractères, fort contraste)
- `src/presets/index.ts` — API publique du module
- `src/presets/__tests__/resolve.test.ts` — Tests unitaires du moteur
- `src/presets/__tests__/presets.config.test.ts` — Validation de la configuration
- `src/presets/__tests__/PresetCard.test.tsx` — Tests du composant

## Comment l'utiliser

### 1. Lors de l'entrée dans une cellule scorée

Depuis n'importe où dans l'app (p.ex. `src/gps/components/SessionHUD.tsx`):

```typescript
import { resolvePreset, setActivePresetId } from '@/presets';
import type { ScoreCell, Session } from '@/db/types';

// Vous avez une cellule scorée et le contexte de session
const cell: ScoreCell = /* ... */;
const session: Session = /* ... */;

const resolution = resolvePreset(cell, {
  soilCondition: session.soilCondition,
  landUse: /* optionnel — from RPG data if available */
});

// Afficher la carte du preset
const preset = resolution.preset;
// → <PresetCard preset={preset} modulation={resolution.modulation} />

// Enregistrer le preset actif pour les DigPoint futurs
setActivePresetId(preset.id);
```

### 2. Lors de la création d'un DigPoint

Dans `src/finds/QuickActions.tsx` ou `src/db/schema.ts`:

```typescript
import { getActivePresetId } from '@/presets';

// Quand l'utilisateur crée un DigPoint
const digPoint: DigPoint = {
  id: generateUUID(),
  sessionId: currentSession.id,
  at: new Date().toISOString(),
  coord: currentGPS,
  accuracyM: accuracy,
  presetId: getActivePresetId() ?? undefined, // ← enregistrement automatique
  outcome: 'rien',
  // ...
};

await db.digPoints.add(digPoint);
```

## Affichage sur le terrain

La `PresetCard` est dimensionnée pour la lisibilité au soleil bras tendu:

- **Font**: monospace 18-24px
- **Contrast**: fond noir (#1a1a1a) + texte blanc + accent jaune (#ffcc00)
- **Dimensions**: max-width 360px
- **Contenu**: 4 lignes techniques + 1 ligne "pourquoi" + modulation optionnelle

```tsx
<PresetCard 
  preset={preset} 
  modulation={resolution.modulation}
/>

// Optionnel : badge compact pour listes
<PresetBadge preset={preset} />
```

## Architecture

### `resolvePreset(cell, ctx) → PresetResolution`

**Flux:**
1. Find dominant criterion (highest weight × value product)
2. Map criterion → preset via `criterionToPreset` table
3. Apply `soilCondition` override (if present)
4. Apply `landUse` override (if no soil override)
5. Adjust sensitivity by soil condition delta
6. Return preset + explanation

**Tous les mappings viennent de `config/presets.json`** — aucune valeur en dur dans le code.

### Config JSON structure

```json
{
  "profiles": [ /* 8 presets */ ],
  "criterionToPreset": { /* 12 mappings */ },
  "soilConditionModulation": { /* 6 conditions */ },
  "landUseModulation": { /* 4 land uses */ },
  "defaults": { "fallbackPresetId": "labour_frais" }
}
```

**Modification à chaud:** Modifier `config/presets.json` et recharger la page modifie immédiatement le comportement de `resolvePreset()` — pas de rebuild requis.

## Limitations Vite / rechargement à chaud

`config/presets.json` est importé une fois au démarrage. Pour que les changements soient visibles:
1. **Pendant le développement**: Si vous modifiez le JSON pendant que HMR tourne, rechargez la page (Cmd+Shift+R)
2. **En production**: Les changements de config requirent un redéploiement

Pour contourner cela dans v2, utiliser une fetch async ou un endpoint API pour charger la config.

## État du preset actif

L'état global `activePresetId` est persisté localement mais **pas synced à Supabase**. C'est par design:

- `presetId` est écrit sur chaque `DigPoint` (immutable, synced)
- `activePresetId` est juste une variable de travail en session
- Si le téléphone crash, le nouvel utilisateur proposera un preset par la cellule courante

## Tests

**Couverture:**
- 10 tests PresetCard (typage, structure)
- 23 tests resolve.ts (sélection, modulation, edge cases)
- 25 tests presets.config.json (validation, intégrité, orphans)

**Lancer:**
```bash
npm run test -- src/presets/
```

**Tous passent ✓ (58 tests).**

## Hypothèse de statut

**Status: [HYPOTHÈSE — synthèse doc ACE 250, à réviser sur DigPoints réels]**

Les valeurs du tableau §9.8 du plan sont dérivées de la documentation du Garrett ACE 250 et de pratiques rapportées, **pas** de mesures sur le terrain à Armous-et-Cau.

**À réviser après première sortie:**
- Les fourchettes de sensibilité dépendent de la minéralisation locale (argile, molasse)
- L'efficacité réelle du petit disque sniper sur billon médiéval
- Le seuil pratique de "ça bavarde" (4-5 vs 6-7 sensibilité)

Le module T4.1 (évaluation des presets) comparera le rendement observé par preset et proposera des corrections.

## Point d'intégration en read-only

Imports à ne pas modifier (lecture seule):

- `src/db/types.ts` — `ScoreCell`, `DetectorPreset`, `Session`
- `src/scoring/index.ts` — types de scoring
- `config/scoring.json` — critères de scoring (lien §8 lot T3.5)
