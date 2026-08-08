/**
 * Tests for weather module.
 *
 * Tests use a fixed Open-Meteo response fixture to avoid network calls.
 */

import { describe, it, expect } from 'vitest';
import {
  getCumulativePrecipitation,
  getRecentSoilMoisture,
  assessSoilCondition,
  summarizeWeather,
  WeatherData,
} from '../weather';

/**
 * Fixture: real Open-Meteo response for Armous-et-Cau (2026-08-08).
 * This matches the curl output verified during T1.6 implementation.
 */
const FIXTURE_WEATHER_DATA: WeatherData = {
  latitude: 43.58,
  longitude: 0.19999981,
  timezone: 'Europe/Paris',
  elevationM: 234.0,
  daily: {
    time: [
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
    ],
    precipitation_sum: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  },
  hourly: {
    time: Array.from({ length: 192 }, (_, idx) => {
      const d = new Date('2026-08-01T00:00:00Z');
      d.setHours(d.getHours() + idx);
      return d.toISOString();
    }),
    soil_moisture_0_to_1cm: Array.from({ length: 192 }, () => {
      // Simulate dry soil with slight variation
      return 0.08 + Math.random() * 0.02;
    }),
  },
  lastUpdated: '2026-08-08T12:00:00Z',
};

describe('weather module', () => {
  describe('getCumulativePrecipitation', () => {
    it('sums daily precipitation over past 7 days', () => {
      const data: WeatherData = {
        ...FIXTURE_WEATHER_DATA,
        daily: {
          time: ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'],
          precipitation_sum: [1.0, 2.0, 0.5, 3.0, 1.5, 0.0, 2.0],
        },
      };

      const total = getCumulativePrecipitation(data, 7);
      expect(total).toBe(10.0);
    });

    it('handles zero precipitation', () => {
      const total = getCumulativePrecipitation(FIXTURE_WEATHER_DATA, 7);
      expect(total).toBe(0.0);
    });

    it('sums only the requested number of days', () => {
      const data: WeatherData = {
        ...FIXTURE_WEATHER_DATA,
        daily: {
          time: ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'],
          precipitation_sum: [1.0, 2.0, 0.5, 3.0, 1.5, 0.0, 2.0],
        },
      };

      const total3d = getCumulativePrecipitation(data, 3);
      expect(total3d).toBe(3.5); // 2.0 + 0.0 + 2.0 (last 3)
    });
  });

  describe('getRecentSoilMoisture', () => {
    it('computes average soil moisture over past 24 hours', () => {
      const avg = getRecentSoilMoisture(FIXTURE_WEATHER_DATA);
      expect(avg).toBeGreaterThan(0.08);
      expect(avg).toBeLessThan(0.11);
    });

    it('handles empty soil moisture array', () => {
      const data: WeatherData = {
        ...FIXTURE_WEATHER_DATA,
        hourly: { time: [], soil_moisture_0_to_1cm: [] },
      };
      const avg = getRecentSoilMoisture(data);
      expect(avg).toBe(0);
    });
  });

  describe('assessSoilCondition', () => {
    it('returns "Optimal" for recent rain with moderate moisture', () => {
      const data: WeatherData = {
        ...FIXTURE_WEATHER_DATA,
        daily: {
          time: ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'],
          precipitation_sum: [0, 0, 8.0, 0, 0, 0, 0], // 8mm 3-4 days ago
        },
        hourly: {
          ...FIXTURE_WEATHER_DATA.hourly,
          soil_moisture_0_to_1cm: Array(192).fill(0.18), // moderate moisture
        },
      };

      const assessment = assessSoilCondition(data);
      expect(assessment).toContain('Optimal');
    });

    it('returns "Très sec" for zero precipitation and low moisture', () => {
      const data: WeatherData = {
        ...FIXTURE_WEATHER_DATA,
        daily: {
          time: ['2026-08-01', '2026-08-02', '2026-08-03'],
          precipitation_sum: [0, 0, 0],
        },
        hourly: {
          ...FIXTURE_WEATHER_DATA.hourly,
          soil_moisture_0_to_1cm: Array(192).fill(0.05),
        },
      };

      const assessment = assessSoilCondition(data);
      expect(assessment).toContain('sec');
    });

    it('returns "Trop humide" for high soil moisture', () => {
      const data: WeatherData = {
        ...FIXTURE_WEATHER_DATA,
        hourly: {
          ...FIXTURE_WEATHER_DATA.hourly,
          soil_moisture_0_to_1cm: Array(192).fill(0.35),
        },
      };

      const assessment = assessSoilCondition(data);
      expect(assessment).toContain('humide');
    });
  });

  describe('summarizeWeather', () => {
    it('produces a valid summary', () => {
      const summary = summarizeWeather(FIXTURE_WEATHER_DATA);

      expect(summary).toHaveProperty('cumPrecipitation7d');
      expect(summary).toHaveProperty('avgSoilMoisture');
      expect(summary).toHaveProperty('lastUpdated');
      expect(summary).toHaveProperty('assessment');

      expect(summary.cumPrecipitation7d).toBe(0);
      expect(summary.avgSoilMoisture).toBeGreaterThan(0);
    });
  });
});
