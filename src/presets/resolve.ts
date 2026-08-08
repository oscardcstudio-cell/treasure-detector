/**
 * Preset resolution engine
 *
 * Given a ScoreCell and optional context (soilCondition, landUse),
 * selects the best-fit DetectorPreset derived from:
 * 1. The dominant scoring criterion (highest weight × value)
 * 2. Modulated by soilCondition (Session metadata) and landUse (RPG data)
 *
 * All values come from config/presets.json — no hardcoded presets in code.
 */

import type { ScoreCell, DetectorPreset } from '../db/types';
import type { Session } from '../db/types';
import presetsConfig from '../../config/presets.json';

export interface ResolveContext {
  soilCondition?: Session['soilCondition'];
  landUse?: string; // RPG classification, e.g. 'labour', 'prairie', 'bois'
}

export interface PresetResolution {
  preset: DetectorPreset;
  why: string; // explanation of which criterion triggered this choice
  modulation?: string; // explanation of soil/land-use adjustment
}

/**
 * Find the dominant criterion in a ScoreCell.
 * Dominant = highest (weight × value) product.
 */
function getDominantCriterion(cell: ScoreCell): {
  criterion: string;
  weight: number;
  value: number;
  evidence: string;
} | null {
  if (!cell.contributions || cell.contributions.length === 0) {
    return null;
  }

  let max = { score: 0, criterion: null as any };

  cell.contributions.forEach((contrib) => {
    const product = contrib.weight * contrib.value;
    if (product > max.score) {
      max.score = product;
      max.criterion = {
        criterion: contrib.criterion,
        weight: contrib.weight,
        value: contrib.value,
        evidence: contrib.evidence,
      };
    }
  });

  return max.criterion;
}

/**
 * Load a preset by ID from config/presets.json.
 * Returns null if not found.
 */
function loadPreset(presetId: string): DetectorPreset | null {
  const profileData = (presetsConfig as any).profiles.find(
    (p: any) => p.id === presetId
  );

  if (!profileData) {
    return null;
  }

  return {
    id: profileData.id,
    label: profileData.label,
    mode: profileData.mode,
    sensitivity: profileData.sensitivity,
    notch: profileData.notch,
    coil: profileData.coil,
    sweep: profileData.sweep,
    digRule: profileData.digRule,
    expect: profileData.expect,
    why: profileData.why,
  };
}

/**
 * Apply sensitivity adjustment based on soil condition.
 * Modulates the sensitivity range [min, max] by a delta.
 */
function adjustSensitivity(
  range: [number, number],
  adjustment: number
): [number, number] {
  return [
    Math.max(1, Math.min(8, range[0] + adjustment)),
    Math.max(1, Math.min(8, range[1] + adjustment)),
  ];
}

/**
 * Main export: resolve a preset for a given ScoreCell.
 *
 * @param cell - ScoreCell from the scoring engine
 * @param ctx - Optional context (soilCondition, landUse)
 * @returns PresetResolution with preset, why, and optional modulation
 */
export function resolvePreset(
  cell: ScoreCell,
  ctx: ResolveContext = {}
): PresetResolution {
  const config = presetsConfig as any;

  // Step 1: Find dominant criterion
  const dominant = getDominantCriterion(cell);
  if (!dominant) {
    // No contributions — use fallback
    const fallbackPreset = loadPreset(config.defaults.fallbackPresetId);
    if (!fallbackPreset) {
      throw new Error(
        `Fallback preset "${config.defaults.fallbackPresetId}" not found in config`
      );
    }
    return {
      preset: fallbackPreset,
      why: config.defaults.fallbackReason,
    };
  }

  // Step 2: Map criterion to preset via criterionToPreset table
  const mapping = config.criterionToPreset as Record<string, string>;
  const basePresetId = mapping[dominant.criterion];
  if (!basePresetId) {
    // Criterion not in mapping — use fallback with warning
    const fallbackPreset = loadPreset(config.defaults.fallbackPresetId);
    if (!fallbackPreset) {
      throw new Error('Fallback preset not found');
    }
    return {
      preset: fallbackPreset,
      why: `Critère "${dominant.criterion}" non mappé — utilisant préset par défaut.`,
    };
  }

  // Step 3: Check for soilCondition override
  let effectivePresetId = basePresetId;
  let modulation = '';

  if (ctx.soilCondition) {
    const soilMod = config.soilConditionModulation[ctx.soilCondition];
    if (soilMod?.presetOverride) {
      effectivePresetId = soilMod.presetOverride;
      modulation = `Soil condition "${ctx.soilCondition}" overrides preset to "${effectivePresetId}".`;
    } else if (soilMod?.sensitivityAdjustment) {
      modulation = `Soil condition "${ctx.soilCondition}" lowers sensitivity by ${soilMod.sensitivityAdjustment}.`;
    }
  }

  // Step 4: Check for landUse override (if not overridden by soil)
  if (ctx.landUse && !modulation) {
    const landMod = config.landUseModulation[ctx.landUse];
    if (landMod?.presetOverride) {
      effectivePresetId = landMod.presetOverride;
      modulation = `Land use "${ctx.landUse}" overrides preset to "${effectivePresetId}".`;
    }
  }

  // Step 5: Load the effective preset
  const preset = loadPreset(effectivePresetId);
  if (!preset) {
    throw new Error(`Preset "${effectivePresetId}" not found in config`);
  }

  // Step 6: Apply sensitivity adjustment if soilCondition specified
  let adjustedPreset = { ...preset };
  if (ctx.soilCondition) {
    const soilMod = config.soilConditionModulation[ctx.soilCondition];
    if (soilMod?.sensitivityAdjustment && !soilMod.presetOverride) {
      adjustedPreset.sensitivity = adjustSensitivity(
        preset.sensitivity,
        soilMod.sensitivityAdjustment
      );
      if (!modulation) {
        modulation = `Soil condition "${ctx.soilCondition}" lowers sensitivity to ${adjustedPreset.sensitivity.join('-')}.`;
      }
    }
  }

  return {
    preset: adjustedPreset,
    why: `Critère dominant : ${dominant.criterion} (poids ${dominant.weight}, valeur ${(dominant.value * 100).toFixed(0)}%). ${dominant.evidence}`,
    modulation: modulation || undefined,
  };
}

/**
 * Utility: get all available presets for display/debugging.
 */
export function getAllPresets(): DetectorPreset[] {
  const config = presetsConfig as any;
  return config.profiles.map((p: any) => ({
    id: p.id,
    label: p.label,
    mode: p.mode,
    sensitivity: p.sensitivity,
    notch: p.notch,
    coil: p.coil,
    sweep: p.sweep,
    digRule: p.digRule,
    expect: p.expect,
    why: p.why,
  }));
}

/**
 * Utility: get preset by ID.
 */
export function getPresetById(id: string): DetectorPreset | null {
  return loadPreset(id);
}
