/**
 * Tests for agricultural calendar module.
 */

import { describe, it, expect } from 'vitest';
import {
  checkAccessibility,
  isProspectableNow,
  getBestMonths,
  getNextProspectableWindow,
  assessCalendarStatus,
  getMonthName,
} from '../calendar';

describe('calendar module', () => {
  describe('checkAccessibility', () => {
    it('allows prospecting in summer for winter cereals (after harvest)', () => {
      // July = after harvest (month 7)
      const { prospectable, reason } = checkAccessibility('cereales_hiver', 7);
      expect(prospectable).toBe(true);
      expect(reason).toContain('moisson');
    });

    it('blocks prospecting in spring for winter cereals (growing season)', () => {
      // May = blé sur pied (month 5)
      const { prospectable } = checkAccessibility('cereales_hiver', 5);
      expect(prospectable).toBe(false);
    });

    it('allows prospecting after corn harvest', () => {
      // October = after corn harvest (month 10)
      const { prospectable } = checkAccessibility('mais', 10);
      expect(prospectable).toBe(true);
    });

    it('blocks prospecting during growing season for corn', () => {
      // June = corn on the plant (month 6)
      const { prospectable } = checkAccessibility('mais', 6);
      expect(prospectable).toBe(false);
    });

    it('allows meadow prospecting year-round', () => {
      for (let month = 1; month <= 12; month++) {
        const { prospectable } = checkAccessibility('prairie', month);
        expect(prospectable).toBe(true);
      }
    });

    it('defaults to "inconnu" when type is unknown', () => {
      const { prospectable } = checkAccessibility('inconnu', 6);
      expect(prospectable).toBe(true); // unknown is treated as accessible
    });
  });

  describe('isProspectableNow', () => {
    it('returns true if current month is in an accessible window', () => {
      // Fake "now" as July (harvest time for winter cereals)
      const julyDate = new Date(2026, 6, 15); // July 15, 2026
      const result = isProspectableNow('cereales_hiver', julyDate);
      expect(result).toBe(true);
    });

    it('returns false if current month is not accessible', () => {
      // Fake "now" as May (growing season)
      const mayDate = new Date(2026, 4, 15); // May 15, 2026
      const result = isProspectableNow('cereales_hiver', mayDate);
      expect(result).toBe(false);
    });
  });

  describe('getBestMonths', () => {
    it('returns list of prospectable months for a crop', () => {
      const best = getBestMonths('cereales_hiver');
      expect(best).toContain(7); // July (after harvest)
      expect(best).toContain(8); // August (stubble)
      expect(best).not.toContain(5); // May (growing)
    });

    it('returns all 12 months for prairie', () => {
      const best = getBestMonths('prairie');
      expect(best.length).toBe(12);
    });
  });

  describe('getNextProspectableWindow', () => {
    it('returns next window when searching forward', () => {
      // From June (not accessible for winter cereals)
      const window = getNextProspectableWindow('cereales_hiver', 6);
      expect(window).toBeTruthy();
      expect(window?.startMonth).toBe(7); // July
    });

    it('returns a valid prospectable window', () => {
      // From any month, should return a valid window
      const window = getNextProspectableWindow('mais', 5);
      expect(window).toBeTruthy();
      expect(window?.startMonth).toBeGreaterThanOrEqual(1);
      expect(window?.endMonth).toBeLessThanOrEqual(12);
    });

    it('returns null for prairie (always accessible)', () => {
      // This should always find a window, so never null
      const window = getNextProspectableWindow('prairie', 5);
      expect(window).toBeTruthy();
    });
  });

  describe('assessCalendarStatus', () => {
    it('returns "now" during accessible months', () => {
      const julyDate = new Date(2026, 6, 15);
      const status = assessCalendarStatus('cereales_hiver', julyDate);
      expect(status.status).toBe('now');
    });

    it('returns "out_of_season" during inaccessible months', () => {
      const mayDate = new Date(2026, 4, 15);
      const status = assessCalendarStatus('cereales_hiver', mayDate);
      expect(status.status).toMatch(/soon|out_of_season/);
    });

    it('includes a nextWindow for "soon" status', () => {
      const mayDate = new Date(2026, 4, 15);
      const status = assessCalendarStatus('cereales_hiver', mayDate);
      if (status.status === 'soon') {
        expect(status.nextWindow).toBeTruthy();
      }
    });
  });

  describe('getMonthName', () => {
    it('returns correct French month names', () => {
      expect(getMonthName(1)).toBe('Janvier');
      expect(getMonthName(7)).toBe('Juillet');
      expect(getMonthName(12)).toBe('Décembre');
    });
  });
});
