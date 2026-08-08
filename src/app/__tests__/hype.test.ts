import { describe, it, expect } from 'vitest';
import { pickHypeLine, getRandomHypeLine } from '../hype';
import hypeConfig from '../../../config/hype.json';

describe('hype module', () => {
  describe('pickHypeLine', () => {
    it('should return same line for same seed', () => {
      const line1 = pickHypeLine('test-location-1');
      const line2 = pickHypeLine('test-location-1');
      expect(line1).toBe(line2);
    });

    it('should return different lines for different seeds', () => {
      const lines = new Set<string>();
      lines.add(pickHypeLine('location-a'));
      lines.add(pickHypeLine('location-b'));
      lines.add(pickHypeLine('location-c'));
      lines.add(pickHypeLine('location-d'));
      lines.add(pickHypeLine('location-e'));

      // At least some variation expected
      expect(lines.size).toBeGreaterThan(1);
    });

    it('should return non-empty string when enabled', () => {
      const line = pickHypeLine('any-seed');
      expect(line).toBeTruthy();
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
    });

    it('should only return lines from config', () => {
      const line = pickHypeLine('test-seed');
      const allLines = [...hypeConfig.lines.tonyMontana, ...hypeConfig.lines.argotTerrain];
      expect(allLines).toContain(line);
    });

    it('should be distributed across multiple seeds', () => {
      const distribution = new Map<string, number>();

      // Test 100 different seeds to ensure good coverage
      for (let i = 0; i < 100; i++) {
        const line = pickHypeLine(`seed-${i}`);
        distribution.set(line, (distribution.get(line) || 0) + 1);
      }

      // Expect at least 5 different lines to be selected (good distribution)
      expect(distribution.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getRandomHypeLine', () => {
    it('should return non-empty string', () => {
      const line = getRandomHypeLine();
      expect(line).toBeTruthy();
      expect(typeof line).toBe('string');
    });

    it('should return lines from config', () => {
      const line = getRandomHypeLine();
      const allLines = [...hypeConfig.lines.tonyMontana, ...hypeConfig.lines.argotTerrain];
      expect(allLines).toContain(line);
    });
  });
});
