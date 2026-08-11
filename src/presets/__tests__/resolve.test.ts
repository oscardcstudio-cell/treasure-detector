/**
 * Unit tests for preset resolution engine
 *
 * Tests:
 * 1. Dominant criterion selection (highest weight × value)
 * 2. Criterion → preset mapping via criterionToPreset table
 * 3. Soil condition modulation (override or sensitivity adjustment)
 * 4. Land use modulation
 * 5. Fallback behavior when criterion not found
 * 6. Sensitivity adjustment calculations
 */

import { describe, it, expect } from 'vitest';
import { resolvePreset, getPresetById, getAllPresets } from '../resolve';
import type { ScoreCell } from '../../db/types';

describe('Preset Resolution Engine', () => {
  describe('resolvePreset: dominant criterion selection', () => {
    it('should select the criterion with highest weight × value product', () => {
      const cell: ScoreCell = {
        h3: 'test_h3',
        score: 75,
        contributions: [
          {
            criterion: 'armous_village',
            criterionId: 'armous_village',
            weight: 30,
            value: 0.8, // product = 24
            evidence: 'Village evidence',
          },
          {
            criterion: 'tuileries',
            criterionId: 'tuileries',
            weight: 20,
            value: 0.5, // product = 10
            evidence: 'Tile evidence',
          },
        ],
      };

      const result = resolvePreset(cell);
      expect(result.preset.id).toBe('coeur_village');
      expect(result.why).toContain('armous_village');
    });

    it('should use fallback when cell has no contributions', () => {
      const cell: ScoreCell = {
        h3: 'test_h3',
        score: 0,
        contributions: [],
      };

      const result = resolvePreset(cell);
      expect(result.preset.id).toBe('labour_frais');
      expect(result.why).toContain('Aucun critère');
    });
  });

  describe('resolvePreset: criterion-to-preset mapping', () => {
    it('should map armous_village to coeur_village', () => {
      const cell: ScoreCell = {
        h3: 'test',
        score: 80,
        contributions: [
          {
            criterion: 'armous_village',
            criterionId: 'armous_village',
            weight: 30,
            value: 1.0,
            evidence: 'test',
          },
        ],
      };
      const result = resolvePreset(cell);
      expect(result.preset.id).toBe('coeur_village');
    });

    it('should map tuileries to villa_champ_ouvert', () => {
      const cell: ScoreCell = {
        h3: 'test',
        score: 80,
        contributions: [
          {
            criterion: 'tuileries',
            criterionId: 'tuileries',
            weight: 20,
            value: 1.0,
            evidence: 'test',
          },
        ],
      };
      const result = resolvePreset(cell);
      expect(result.preset.id).toBe('villa_champ_ouvert');
    });

    it('should map caussade_via to voie_ancienne', () => {
      const cell: ScoreCell = {
        h3: 'test',
        score: 80,
        contributions: [
          {
            criterion: 'caussade_via',
            criterionId: 'caussade_via',
            weight: 24,
            value: 1.0,
            evidence: 'test',
          },
        ],
      };
      const result = resolvePreset(cell);
      expect(result.preset.id).toBe('voie_ancienne');
    });

    it('should map midour_source to moulin_bord_eau', () => {
      const cell: ScoreCell = {
        h3: 'test',
        score: 80,
        contributions: [
          {
            criterion: 'midour_source',
            criterionId: 'midour_source',
            weight: 25,
            value: 1.0,
            evidence: 'test',
          },
        ],
      };
      const result = resolvePreset(cell);
      expect(result.preset.id).toBe('moulin_bord_eau');
    });
  });

  describe('soilCondition modulation', () => {
    const baseCell: ScoreCell = {
      h3: 'test',
      score: 80,
      contributions: [
        {
          criterion: 'caussade_via',
          criterionId: 'caussade_via',
          weight: 24,
          value: 1.0,
          evidence: 'test',
        },
      ],
    };

    it('should override to labour_frais when soilCondition is labour_frais', () => {
      const result = resolvePreset(baseCell, { soilCondition: 'labour_frais' });
      expect(result.preset.id).toBe('labour_frais');
      expect(result.modulation).toContain('labour_frais');
    });

    it('should override to sol_detrempe when soilCondition is humide', () => {
      const result = resolvePreset(baseCell, { soilCondition: 'humide' });
      expect(result.preset.id).toBe('sol_detrempe');
      expect(result.modulation).toContain('humide');
    });

    it('should override to sol_detrempe when soilCondition is gele', () => {
      const result = resolvePreset(baseCell, { soilCondition: 'gele' });
      expect(result.preset.id).toBe('sol_detrempe');
    });

    it('should override to prairie when soilCondition is prairie', () => {
      const result = resolvePreset(baseCell, { soilCondition: 'prairie' });
      expect(result.preset.id).toBe('prairie');
    });

    it('should adjust sensitivity down by 0.5 for sec condition', () => {
      const result = resolvePreset(baseCell, { soilCondition: 'sec' });
      // Base voie_ancienne is [6, 7], adjusted by -0.5
      expect(result.preset.sensitivity[0]).toBe(5.5); // clamped/rounded to range
      expect(result.modulation).toContain('sec');
    });
  });

  describe('landUse modulation', () => {
    const baseCell: ScoreCell = {
      h3: 'test',
      score: 80,
      contributions: [
        {
          criterion: 'armous_village',
          criterionId: 'armous_village',
          weight: 30,
          value: 1.0,
          evidence: 'test',
        },
      ],
    };

    it('should override to labour_frais when landUse is labour', () => {
      const result = resolvePreset(baseCell, { landUse: 'labour' });
      expect(result.preset.id).toBe('labour_frais');
      expect(result.modulation).toContain('labour');
    });

    it('should override to prairie when landUse is prairie', () => {
      const result = resolvePreset(baseCell, { landUse: 'prairie' });
      expect(result.preset.id).toBe('prairie');
    });

    it('should override to bois when landUse is bois', () => {
      const result = resolvePreset(baseCell, { landUse: 'bois' });
      expect(result.preset.id).toBe('bois');
    });
  });

  describe('soilCondition vs landUse priority', () => {
    const baseCell: ScoreCell = {
      h3: 'test',
      score: 80,
      contributions: [
        {
          criterion: 'caussade_via',
          criterionId: 'caussade_via',
          weight: 24,
          value: 1.0,
          evidence: 'test',
        },
      ],
    };

    it('should prioritize soilCondition override over landUse', () => {
      const result = resolvePreset(baseCell, {
        soilCondition: 'labour_frais',
        landUse: 'prairie', // should be ignored
      });
      expect(result.preset.id).toBe('labour_frais');
    });
  });

  describe('preset content validation', () => {
    it('coeur_village preset has correct mode and sensitivities', () => {
      const preset = getPresetById('coeur_village');
      expect(preset).toBeDefined();
      expect(preset!.mode).toBe('all_metal');
      expect(preset!.sensitivity).toEqual([6, 7]);
      expect(preset!.coil).toBe('sniper_4.5');
      expect(preset!.sweep).toBe('tres_lent');
      expect(preset!.expect).toContain('billon');
    });

    it('villa_champ_ouvert preset uses stock coil', () => {
      const preset = getPresetById('villa_champ_ouvert');
      expect(preset!.coil).toBe('stock_6.5x9');
    });

    it('sol_detrempe preset has lower sensitivity range', () => {
      const preset = getPresetById('sol_detrempe');
      expect(preset!.sensitivity).toEqual([4, 5]);
    });
  });

  describe('getAllPresets utility', () => {
    it('should return all 8 presets', () => {
      const presets = getAllPresets();
      expect(presets).toHaveLength(8);
      expect(presets.map((p) => p.id)).toContain('coeur_village');
      expect(presets.map((p) => p.id)).toContain('labour_frais');
    });

    it('each preset should have label, mode, sensitivity, coil, sweep, digRule', () => {
      const presets = getAllPresets();
      presets.forEach((preset) => {
        expect(preset.id).toBeDefined();
        expect(preset.label).toBeDefined();
        expect(preset.mode).toBeDefined();
        expect(preset.sensitivity).toBeDefined();
        expect(preset.notch).toBeDefined();
        expect(preset.coil).toBeDefined();
        expect(preset.sweep).toBeDefined();
        expect(preset.digRule).toBeDefined();
        expect(preset.why).toBeDefined();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null context gracefully', () => {
      const cell: ScoreCell = {
        h3: 'test',
        score: 80,
        contributions: [
          {
            criterion: 'armous_village',
            criterionId: 'armous_village',
            weight: 30,
            value: 1.0,
            evidence: 'test',
          },
        ],
      };
      const result = resolvePreset(cell, {});
      expect(result.preset).toBeDefined();
      expect(result.why).toContain('armous_village');
    });

    it('should clamp sensitivity to valid range [1, 8]', () => {
      const cell: ScoreCell = {
        h3: 'test',
        score: 80,
        contributions: [
          {
            criterion: 'moulin_bord_eau', // [5, 6]
            criterionId: 'moulin_bord_eau',
            weight: 25,
            value: 1.0,
            evidence: 'test',
          },
        ],
      };
      // Applying a -5 adjustment should clamp to [1, 1]
      const result = resolvePreset(cell, { soilCondition: 'sec' });
      expect(result.preset.sensitivity[0]).toBeGreaterThanOrEqual(1);
      expect(result.preset.sensitivity[1]).toBeLessThanOrEqual(8);
    });

    it('should handle multiple contributions with same weight', () => {
      const cell: ScoreCell = {
        h3: 'test',
        score: 80,
        contributions: [
          {
            criterion: 'armous_village',
            criterionId: 'armous_village',
            weight: 30,
            value: 0.5, // product = 15
            evidence: 'test1',
          },
          {
            criterion: 'cau_village',
            criterionId: 'cau_village',
            weight: 30,
            value: 0.5, // product = 15 (tie)
            evidence: 'test2',
          },
        ],
      };
      const result = resolvePreset(cell);
      // Should pick first one in order
      expect(result.preset.id).toBe('coeur_village');
    });
  });
});
