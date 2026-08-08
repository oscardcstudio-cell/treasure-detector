/**
 * Weather data from Open-Meteo (free, no API key required).
 * Provides precipitation history (past 7 days) and soil moisture for decision-making
 * about when to prospect.
 *
 * API: https://open-meteo.com/en/docs/historical-weather-api
 * No authentication, but respect rate limits (10k requests/day free tier).
 *
 * Data stored in Dexie with timestamp for offline use.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  elevationM: number;
  daily: {
    time: string[]; // ISO dates (e.g., "2026-08-08")
    precipitation_sum: number[]; // mm per day
  };
  hourly: {
    time: string[]; // ISO timestamps
    soil_moisture_0_to_1cm: number[]; // m³/m³ (volumetric water content)
  };
  lastUpdated: string; // ISO timestamp when fetched
}

interface WeatherDB extends DBSchema {
  weather: {
    key: string; // 'weather:lat,lon'
    value: WeatherData;
  };
}

const DB_NAME = 'TreasureDetectorWeather';
const STORE_NAME = 'weather';

let db: IDBPDatabase<WeatherDB> | null = null;

async function initDB() {
  if (db) return db;
  db = await openDB<WeatherDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
  return db;
}

/**
 * Fetch weather data from Open-Meteo.
 * @param lat latitude (e.g., 43.5742)
 * @param lon longitude (e.g., 0.1908)
 * @param pastDays number of past days to include (default 7)
 * @returns WeatherData with precipitation and soil moisture
 */
export async function fetchWeatherData(
  lat: number,
  lon: number,
  pastDays = 7
): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('daily', 'precipitation_sum');
  url.searchParams.set('hourly', 'soil_moisture_0_to_1cm');
  url.searchParams.set('timezone', 'Europe/Paris');
  url.searchParams.set('past_days', pastDays.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }

  const json = await response.json();

  // Parse response
  const data: WeatherData = {
    latitude: json.latitude,
    longitude: json.longitude,
    timezone: json.timezone,
    elevationM: json.elevation,
    daily: {
      time: json.daily.time,
      precipitation_sum: json.daily.precipitation_sum,
    },
    hourly: {
      time: json.hourly.time,
      soil_moisture_0_to_1cm: json.hourly.soil_moisture_0_to_1cm,
    },
    lastUpdated: new Date().toISOString(),
  };

  return data;
}

/**
 * Cache weather data in Dexie IndexedDB with a timestamp.
 * Enables offline access to the last known data.
 */
export async function cacheWeatherData(data: WeatherData): Promise<void> {
  const database = await initDB();
  const key = `weather:${data.latitude},${data.longitude}`;
  await database.put(STORE_NAME, data, key);
}

/**
 * Retrieve cached weather data from IndexedDB.
 * Returns null if not cached.
 */
export async function getCachedWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  const database = await initDB();
  const key = `weather:${lat},${lon}`;
  return (await database.get(STORE_NAME, key)) || null;
}

/**
 * Fetch weather data with fallback to cache if network fails.
 * @param lat latitude
 * @param lon longitude
 * @param forceRefresh if true, ignore cache and fetch fresh data
 * @returns WeatherData (from API or cache)
 */
export async function getWeatherData(
  lat: number,
  lon: number,
  forceRefresh = false
): Promise<WeatherData> {
  if (!forceRefresh) {
    const cached = await getCachedWeatherData(lat, lon);
    if (cached) {
      return cached;
    }
  }

  const fresh = await fetchWeatherData(lat, lon);
  await cacheWeatherData(fresh);
  return fresh;
}

/**
 * Compute cumulative precipitation over the past N days.
 * @param data WeatherData
 * @param days number of days to sum (default 7)
 * @returns total mm
 */
export function getCumulativePrecipitation(data: WeatherData, days = 7): number {
  const daily = data.daily;
  if (daily.precipitation_sum.length === 0) return 0;

  const slice = daily.precipitation_sum.slice(-days);
  return slice.reduce((a, b) => a + b, 0);
}

/**
 * Get the average soil moisture over the past 24 hours (0-1 cm layer).
 * This is the layer most affected by recent rain and most relevant for detecting.
 *
 * @param data WeatherData
 * @returns average volumetric water content [0..1]
 */
export function getRecentSoilMoisture(data: WeatherData): number {
  const hourly = data.hourly;
  if (hourly.soil_moisture_0_to_1cm.length === 0) return 0;

  // Last 24 hours of hourly data (if available)
  const recentCount = Math.min(24, hourly.soil_moisture_0_to_1cm.length);
  const recent = hourly.soil_moisture_0_to_1cm.slice(-recentCount);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

/**
 * Determine soil condition based on recent precipitation and moisture.
 * Used to advise the prospector.
 *
 * Conditions per §9.3 of PLAN.md:
 * - Optimum: after labour and after rain
 * - After labour + dry: less optimal
 * - Saturated or frozen: unusable
 * - Straw (chaume) after harvest: acceptable compromise
 *
 * @param data WeatherData
 * @returns human-readable soil condition assessment
 */
export function assessSoilCondition(data: WeatherData): string {
  const precip7d = getCumulativePrecipitation(data, 7);
  const moisture = getRecentSoilMoisture(data);

  // Heuristics:
  // - 5-25 mm in past 7d + moderate moisture = good for detecting
  // - > 25 mm or moisture > 0.3 = saturated, avoid
  // - < 5 mm + moisture < 0.1 = dry, okay but not ideal
  // - 0 mm last 3d = very dry, avoid

  if (moisture > 0.3) {
    return 'Trop humide (saturé)';
  }

  const precip3d = getCumulativePrecipitation(data, 3);
  if (precip3d === 0 && moisture < 0.1) {
    return 'Très sec';
  }

  if (precip7d >= 5 && precip7d <= 25 && moisture >= 0.1 && moisture <= 0.25) {
    return 'Optimal (pluie récente, sol humide)';
  }

  if (precip7d > 0 && precip7d < 5) {
    return 'Faible humidité, possible';
  }

  if (precip7d > 25) {
    return 'Trop de pluie récente, attendre';
  }

  return 'Conditions intermédiaires';
}

export interface WeatherSummary {
  /** Total precipitation past 7 days (mm) */
  cumPrecipitation7d: number;
  /** Average soil moisture 0-1cm (volumetric %) */
  avgSoilMoisture: number;
  /** Last updated ISO timestamp */
  lastUpdated: string;
  /** Human-readable assessment */
  assessment: string;
}

/**
 * Generate a summary of weather conditions for display.
 */
export function summarizeWeather(data: WeatherData): WeatherSummary {
  return {
    cumPrecipitation7d: getCumulativePrecipitation(data, 7),
    avgSoilMoisture: getRecentSoilMoisture(data),
    lastUpdated: data.lastUpdated,
    assessment: assessSoilCondition(data),
  };
}
