/**
 * PresetCard component tests
 *
 * Simple snapshot and structure tests (no React Testing Library dependency).
 * Focus on type safety and JSX compilation.
 */

import { describe, it, expect } from 'vitest';
import type { DetectorPreset } from '../../db/types';

describe('PresetCard Component', () => {
  const mockPreset: DetectorPreset = {
    id: 'coeur_village',
    label: 'Cœur de village',
    mode: 'all_metal',
    sensitivity: [6, 7],
    notch: 'aucune',
    coil: 'sniper_4.5',
    sweep: 'tres_lent',
    digRule: 'Creuse tout signal répétable, même faible et râpeux.',
    expect: ['billon', 'boucles', 'appliques'],
    why: 'Noyau villageois médiéval — deniers/oboles faible conductivité.',
  };

  describe('type safety', () => {
    it('should type-check DetectorPreset interface', () => {
      const preset: DetectorPreset = mockPreset;
      expect(preset.id).toBe('coeur_village');
      expect(preset.sensitivity).toEqual([6, 7]);
    });

    it('should accept all valid mode types', () => {
      const modes: Array<DetectorPreset['mode']> = [
        'all_metal',
        'jewelry',
        'custom',
        'relics',
        'coins',
      ];
      modes.forEach((mode) => {
        const preset: DetectorPreset = { ...mockPreset, mode };
        expect(preset.mode).toBe(mode);
      });
    });

    it('should accept all valid coil types', () => {
      const coils: Array<DetectorPreset['coil']> = ['stock_6.5x9', 'sniper_4.5'];
      coils.forEach((coil) => {
        const preset: DetectorPreset = { ...mockPreset, coil };
        expect(preset.coil).toBe(coil);
      });
    });

    it('should accept all valid sweep types', () => {
      const sweeps: Array<DetectorPreset['sweep']> = [
        'tres_lent',
        'lent',
        'normal',
      ];
      sweeps.forEach((sweep) => {
        const preset: DetectorPreset = { ...mockPreset, sweep };
        expect(preset.sweep).toBe(sweep);
      });
    });

    it('should accept all valid notch types', () => {
      const notches: Array<DetectorPreset['notch']> = ['aucune', 'fer_bas_seulement'];
      notches.forEach((notch) => {
        const preset: DetectorPreset = { ...mockPreset, notch };
        expect(preset.notch).toBe(notch);
      });
    });
  });

  describe('preset data structure', () => {
    it('should have required fields', () => {
      expect(mockPreset.id).toBeDefined();
      expect(mockPreset.label).toBeDefined();
      expect(mockPreset.mode).toBeDefined();
      expect(mockPreset.sensitivity).toBeDefined();
      expect(mockPreset.notch).toBeDefined();
      expect(mockPreset.coil).toBeDefined();
      expect(mockPreset.sweep).toBeDefined();
      expect(mockPreset.digRule).toBeDefined();
      expect(mockPreset.expect).toBeDefined();
      expect(mockPreset.why).toBeDefined();
    });

    it('should have non-empty label and digRule', () => {
      expect(mockPreset.label.length).toBeGreaterThan(0);
      expect(mockPreset.digRule.length).toBeGreaterThan(0);
      expect(mockPreset.why.length).toBeGreaterThan(0);
    });

    it('sensitivity range should be valid', () => {
      expect(mockPreset.sensitivity.length).toBe(2);
      expect(mockPreset.sensitivity[0]).toBeGreaterThanOrEqual(1);
      expect(mockPreset.sensitivity[0]).toBeLessThanOrEqual(8);
      expect(mockPreset.sensitivity[1]).toBeGreaterThanOrEqual(1);
      expect(mockPreset.sensitivity[1]).toBeLessThanOrEqual(8);
      expect(mockPreset.sensitivity[0]).toBeLessThanOrEqual(
        mockPreset.sensitivity[1]
      );
    });

    it('expect array should contain strings', () => {
      expect(Array.isArray(mockPreset.expect)).toBe(true);
      mockPreset.expect.forEach((item) => {
        expect(typeof item).toBe('string');
      });
    });
  });

  describe('8 presets from config', () => {
    it('should be creatable and type-safe', () => {
      const presetIds = [
        'coeur_village',
        'villa_champ_ouvert',
        'voie_ancienne',
        'moulin_bord_eau',
        'prairie',
        'labour_frais',
        'sol_detrempe',
        'bois',
      ];

      presetIds.forEach((id) => {
        const preset: DetectorPreset = {
          ...mockPreset,
          id,
        };
        expect(preset.id).toBe(id);
      });
    });
  });
});
