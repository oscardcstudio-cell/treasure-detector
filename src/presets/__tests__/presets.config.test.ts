/**
 * Configuration validation tests
 *
 * Tests:
 * 1. config/presets.json is valid JSON
 * 2. All profiles are well-formed
 * 3. All criterion mappings point to valid profiles
 * 4. No orphaned presets (all profiles used in at least one mapping)
 */

import { describe, it, expect } from 'vitest';
import presetsConfig from '../../../config/presets.json';

describe('Presets Configuration Validation', () => {
  describe('JSON structure', () => {
    it('should load config without errors', () => {
      expect(presetsConfig).toBeDefined();
    });

    it('should have schema_version', () => {
      expect(presetsConfig.schema_version).toBe('1.0');
    });

    it('should have profiles array', () => {
      expect(Array.isArray(presetsConfig.profiles)).toBe(true);
      expect(presetsConfig.profiles.length).toBe(8);
    });

    it('should have criterionToPreset mapping', () => {
      expect(presetsConfig.criterionToPreset).toBeDefined();
      expect(typeof presetsConfig.criterionToPreset).toBe('object');
    });

    it('should have soilConditionModulation', () => {
      expect(presetsConfig.soilConditionModulation).toBeDefined();
      expect(typeof presetsConfig.soilConditionModulation).toBe('object');
    });

    it('should have defaults section', () => {
      expect(presetsConfig.defaults).toBeDefined();
      expect(presetsConfig.defaults.fallbackPresetId).toBe('labour_frais');
    });
  });

  describe('Profile integrity', () => {
    it('each profile should have required fields', () => {
      presetsConfig.profiles.forEach((profile: any) => {
        if (!profile) return;

        expect(profile.id).toBeDefined();
        expect(typeof profile.id).toBe('string');

        expect(profile.label).toBeDefined();
        expect(typeof profile.label).toBe('string');

        expect(profile.mode).toBeDefined();
        const validModes = ['all_metal', 'jewelry', 'custom', 'relics', 'coins'];
        expect(validModes).toContain(profile.mode);

        expect(profile.sensitivity).toBeDefined();
        expect(Array.isArray(profile.sensitivity)).toBe(true);
        expect(profile.sensitivity.length).toBe(2);
        if (Array.isArray(profile.sensitivity) && profile.sensitivity.length === 2) {
          const minSens = profile.sensitivity[0] as number;
          const maxSens = profile.sensitivity[1] as number;
          expect(minSens).toBeGreaterThanOrEqual(1);
          expect(minSens).toBeLessThanOrEqual(8);
          expect(maxSens).toBeGreaterThanOrEqual(1);
          expect(maxSens).toBeLessThanOrEqual(8);
          expect(minSens <= maxSens).toBe(true);
        }

        expect(profile.notch).toBeDefined();
        const validNotches = ['aucune', 'fer_bas_seulement'];
        expect(validNotches).toContain(profile.notch);

        expect(profile.coil).toBeDefined();
        const validCoils = ['stock_6.5x9', 'sniper_4.5'];
        expect(validCoils).toContain(profile.coil);

        expect(profile.sweep).toBeDefined();
        const validSweeps = ['tres_lent', 'lent', 'normal'];
        expect(validSweeps).toContain(profile.sweep);

        expect(profile.digRule).toBeDefined();
        expect(typeof profile.digRule).toBe('string');
        expect(profile.digRule.length).toBeGreaterThan(0);

        expect(profile.expect).toBeDefined();
        expect(Array.isArray(profile.expect)).toBe(true);

        expect(profile.why).toBeDefined();
        expect(typeof profile.why).toBe('string');
      });
    });

    it('should have exactly 8 profiles with correct IDs', () => {
      const profileIds = presetsConfig.profiles.map((p: any) => p.id);
      const expected = [
        'coeur_village',
        'villa_champ_ouvert',
        'voie_ancienne',
        'moulin_bord_eau',
        'prairie',
        'labour_frais',
        'sol_detrempe',
        'bois',
      ];
      expect(profileIds).toEqual(expected);
    });

    it('coeur_village should have sniper coil and very_lent sweep', () => {
      const profile = presetsConfig.profiles.find(
        (p: any) => p?.id === 'coeur_village'
      );
      expect(profile).toBeDefined();
      if (profile) {
        expect(profile.coil).toBe('sniper_4.5');
        expect(profile.sweep).toBe('tres_lent');
        expect(profile.sensitivity).toEqual([6, 7]);
      }
    });

    it('villa_champ_ouvert should have stock coil', () => {
      const profile = presetsConfig.profiles.find(
        (p: any) => p?.id === 'villa_champ_ouvert'
      );
      expect(profile).toBeDefined();
      if (profile) {
        expect(profile.coil).toBe('stock_6.5x9');
        expect(profile.sensitivity).toEqual([7, 8]);
      }
    });

    it('labour_frais should have normal sweep', () => {
      const profile = presetsConfig.profiles.find(
        (p: any) => p?.id === 'labour_frais'
      );
      expect(profile).toBeDefined();
      if (profile) {
        expect(profile.sweep).toBe('normal');
      }
    });

    it('sol_detrempe should have lowest sensitivity range', () => {
      const profile = presetsConfig.profiles.find(
        (p: any) => p?.id === 'sol_detrempe'
      );
      expect(profile).toBeDefined();
      if (profile) {
        expect(profile.sensitivity).toEqual([4, 5]);
      }
    });
  });

  describe('Criterion mapping coverage', () => {
    it('all criterionToPreset values should point to existing profiles', () => {
      const profileIds = new Set(presetsConfig.profiles.map((p: any) => p.id));
      const mapping = presetsConfig.criterionToPreset as Record<string, string>;

      Object.entries(mapping).forEach(([criterion, presetId]) => {
        const exists = profileIds.has(presetId);
        expect(exists).toBe(true);
        if (!exists) {
          console.warn(
            `Criterion "${criterion}" maps to unknown preset "${presetId}"`
          );
        }
      });
    });

    it('should map at least one criterion to each profile (no orphans)', () => {
      const usedPresets = new Set(
        Object.values(presetsConfig.criterionToPreset)
      );
      const allProfileIds = new Set(
        presetsConfig.profiles.map((p: any) => p.id)
      );

      allProfileIds.forEach((profileId) => {
        const isUsed = usedPresets.has(profileId);
        expect(isUsed).toBe(true);
        if (!isUsed) {
          console.warn(`Preset "${profileId}" is never used in criterionToPreset mapping`);
        }
      });
    });

    it('should have at least 10 criterion mappings (comprehensive coverage)', () => {
      expect(Object.keys(presetsConfig.criterionToPreset).length).toBeGreaterThanOrEqual(
        10
      );
    });
  });

  describe('Soil condition modulation', () => {
    it('should define modulation for expected conditions', () => {
      const soilMod = presetsConfig.soilConditionModulation as Record<
        string,
        any
      >;
      const expectedConditions = [
        'labour_frais',
        'chaume',
        'prairie',
        'sec',
        'gele',
        'humide',
      ];
      expectedConditions.forEach((condition) => {
        expect(soilMod[condition]).toBeDefined();
      });
    });

    it('labour_frais should override to labour_frais preset', () => {
      const soilMod = presetsConfig.soilConditionModulation as Record<
        string,
        any
      >;
      expect(soilMod.labour_frais.presetOverride).toBe('labour_frais');
    });

    it('humide and gele should override to sol_detrempe', () => {
      const soilMod = presetsConfig.soilConditionModulation as Record<
        string,
        any
      >;
      expect(soilMod.humide.presetOverride).toBe('sol_detrempe');
      expect(soilMod.gele.presetOverride).toBe('sol_detrempe');
    });

    it('should have sensitivity adjustments for some conditions', () => {
      const soilMod = presetsConfig.soilConditionModulation as Record<
        string,
        any
      >;
      expect(soilMod.sec.sensitivityAdjustment).toBeDefined();
    });
  });

  describe('Land use modulation', () => {
    it('should define modulation for expected land uses', () => {
      const landUse = presetsConfig.landUseModulation as Record<string, any>;
      const expectedLandUses = ['labour', 'prairie', 'bois', 'bati'];
      expectedLandUses.forEach((luName) => {
        expect(landUse[luName]).toBeDefined();
      });
    });

    it('bati should have flag inaccessible', () => {
      const landUse = presetsConfig.landUseModulation as Record<string, any>;
      expect(landUse.bati.flag).toBe('inaccessible');
    });
  });

  describe('Fallback preset validity', () => {
    it('fallback preset should exist', () => {
      const fallbackId = presetsConfig.defaults.fallbackPresetId;
      const exists = presetsConfig.profiles.some((p: any) => p.id === fallbackId);
      expect(exists).toBe(true);
    });

    it('fallback should be labour_frais', () => {
      expect(presetsConfig.defaults.fallbackPresetId).toBe('labour_frais');
    });
  });

  describe('Status and metadata', () => {
    it('should indicate hypothesis status in _status field', () => {
      expect(presetsConfig._status).toContain('HYPOTHÈSE');
    });

    it('should be dated 2026-08-08', () => {
      expect(presetsConfig.date_locked).toBe('2026-08-08');
    });
  });
});
