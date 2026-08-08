/**
 * Presets module — public API
 *
 * Exports:
 * - resolvePreset(cell, ctx): resolve a DetectorPreset from ScoreCell
 * - getActivePresetId(): get the currently active preset ID (for DigPoint persistence)
 * - PresetCard: React component for field display
 * - getAllPresets(), getPresetById(): utilities
 */

import {
  resolvePreset,
  getAllPresets,
  getPresetById,
  type PresetResolution,
  type ResolveContext,
} from './resolve';
import { PresetCard, PresetBadge } from './PresetCard';
import type { DetectorPreset } from '../db/types';

// Global state for active preset (used when creating DigPoint)
let activePresetId: string | null = null;

/**
 * Set the active preset when entering a cell or when user manually selects one.
 * This ID is recorded on each DigPoint created.
 */
export function setActivePresetId(presetId: string | null): void {
  activePresetId = presetId;
}

/**
 * Get the currently active preset ID.
 * Returns null if no preset is active.
 * Used by QuickActions / DigPoint creation UI to persist the preset.
 */
export function getActivePresetId(): string | null {
  return activePresetId;
}

/**
 * Get the currently active preset object (not just ID).
 * Returns null if no preset is active.
 */
export function getActivePreset(): DetectorPreset | null {
  if (!activePresetId) return null;
  return getPresetById(activePresetId);
}

// Re-export public API from submodules
export { resolvePreset, getAllPresets, getPresetById };
export type { PresetResolution, ResolveContext };
export { PresetCard, PresetBadge };
export type { DetectorPreset };
