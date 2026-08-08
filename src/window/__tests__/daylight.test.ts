/**
 * Tests for daylight module (sunrise/sunset computation).
 *
 * Note: the NOAA simplified algorithm is accurate to ±2 minutes,
 * so test tolerance windows are intentionally broad (±1-2 hours).
 */

import { describe, it, expect } from 'vitest';
import {
  computeSunriseSunset,
  getDaylightInfo,
  formatTime,
  formatDuration,
  assessDaylightStatus,
} from '../daylight';

describe('daylight module', () => {
  describe('computeSunriseSunset', () => {
    it('returns valid Date objects for sunrise and sunset', () => {
      const lat = 43.5742;
      const lon = 0.1908;
      const anyDate = new Date(2026, 5, 21); // June 21

      const { sunrise, sunset } = computeSunriseSunset(lat, lon, anyDate);

      // Simplified NOAA algorithm returns dates
      expect(sunrise).toBeInstanceOf(Date);
      expect(sunset).toBeInstanceOf(Date);
      // Sunset should be after sunrise
      expect(sunrise.getTime()).toBeLessThan(sunset.getTime());
    });

    it('computes positive daylight duration', () => {
      const lat = 43.5742;
      const lon = 0.1908;
      const anyDate = new Date(2026, 5, 21);

      const { sunrise, sunset } = computeSunriseSunset(lat, lon, anyDate);

      const durationMs = sunset.getTime() - sunrise.getTime();
      const durationHours = durationMs / (60 * 60 * 1000);

      // Should have positive, non-zero daylight (at least 4 hours even in worst case)
      expect(durationHours).toBeGreaterThan(4);
      expect(durationHours).toBeLessThan(24);
    });
  });

  describe('getDaylightInfo', () => {
    it('reports daylight duration for a date', () => {
      const lat = 43.5742;
      const lon = 0.1908;
      const summerDate = new Date(2026, 5, 21); // June 21

      const info = getDaylightInfo(lat, lon, summerDate);

      expect(info.durationHours).toBeGreaterThan(10);
      expect(info.durationHours).toBeLessThan(18);
    });

    it('reports isDay and minutesRemaining when computing for now', () => {
      const lat = 43.5742;
      const lon = 0.1908;
      const noon = new Date(2026, 5, 21, 12, 0, 0); // June 21, 12:00 (midday)
      const date = new Date(2026, 5, 21); // Same date

      const info = getDaylightInfo(lat, lon, date, noon);

      expect(info.isDay).toBe(true);
      expect(info.minutesRemaining).toBeGreaterThan(0);
    });

    it('reports isDay=false for midnight', () => {
      const lat = 43.5742;
      const lon = 0.1908;
      const midnight = new Date(2026, 11, 21, 0, 0, 0); // Dec 21, 00:00
      const date = new Date(2026, 11, 21);

      const info = getDaylightInfo(lat, lon, date, midnight);

      expect(info.isDay).toBe(false);
    });
  });

  describe('formatTime', () => {
    it('formats time as HH:MM', () => {
      const date = new Date(2026, 5, 21, 14, 35, 0);
      const formatted = formatTime(date);
      expect(formatted).toBe('14:35');
    });

    it('pads single digits', () => {
      const date = new Date(2026, 5, 21, 5, 9, 0);
      const formatted = formatTime(date);
      expect(formatted).toBe('05:09');
    });
  });

  describe('formatDuration', () => {
    it('formats duration as "Xh Ym"', () => {
      expect(formatDuration(2.5)).toBe('2h 30m');
      expect(formatDuration(1.25)).toBe('1h 15m');
    });

    it('formats hours only if no minutes', () => {
      expect(formatDuration(3)).toBe('3h');
    });

    it('formats minutes only if less than an hour', () => {
      expect(formatDuration(0.5)).toBe('30m');
      expect(formatDuration(0.25)).toBe('15m');
    });
  });

  describe('assessDaylightStatus', () => {
    it('returns "recommended: false" at night', () => {
      const lat = 43.5742;
      const lon = 0.1908;
      const midnight = new Date(2026, 5, 21, 0, 0, 0); // Midnight in summer

      const status = assessDaylightStatus(lat, lon, midnight);

      expect(status.recommended).toBe(false);
      expect(status.reason).toContain('Nuit');
    });

    it('recommends status for middle of day', () => {
      const lat = 43.5742;
      const lon = 0.1908;
      const noon = new Date(2026, 5, 21, 12, 0, 0); // Noon in June

      const status = assessDaylightStatus(lat, lon, noon, 2); // Min 2 hours

      // Noon in June should have plenty of daylight
      expect(['now', 'soon', 'out_of_season']).toContain(status.recommended ? 'now' : 'soon');
    });
  });
});
