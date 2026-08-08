/**
 * OutingWindow: the synthetic decision-maker for "WHEN to go prospecting"
 *
 * Combines three factors:
 * 1. Weather (recent rain, soil moisture)
 * 2. Agricultural calendar (crop stage access windows)
 * 3. Daylight (sunrise/sunset for today)
 *
 * Output: a single status "NOW / SOON / OUT OF SEASON" with a one-sentence reason.
 *
 * Reference: PLAN.md §1.6, §9.3
 */

import { getWeatherData, type WeatherData } from './weather';
import { assessCalendarStatus, type CropType } from './calendar';
import { assessDaylightStatus } from './daylight';

/**
 * Combined recommendation for prospecting at a location.
 */
export interface OutingRecommendation {
  /** Status: go / wait / out of season */
  status: 'now' | 'soon' | 'out_of_season';
  /** One sentence explanation */
  reason: string;
  /** Detailed assessment from each module */
  details: {
    weather: string;
    calendar: string;
    daylight: string;
  };
}

/**
 * Decision rules for combining weather, calendar, and daylight assessments.
 *
 * These rules are the core of the "WHEN" recommendation.
 * They embody the expertise from §9.3 and §9.7 of PLAN.md.
 *
 * Rationale:
 * - Weather: soil humidity post-rain is optimal for detecting (§9.3)
 * - Calendar: crop stage determines access (§9.3)
 * - Daylight: safety and practical working hours (§9.8)
 *
 * Precedence: All three must align for "NOW".
 * If calendar is "out of season", that overrides everything else.
 */

export async function assessOutingWindow(
  latitude: number,
  longitude: number,
  cropType: CropType = 'inconnu',
  now = new Date()
): Promise<OutingRecommendation> {
  // Fetch weather (with fallback to cache)
  let weatherData;
  try {
    weatherData = await getWeatherData(latitude, longitude, false);
  } catch (error) {
    console.warn('Weather fetch failed, using fallback:', error);
    weatherData = null;
  }

  // Assess calendar
  const calendarAssessment = assessCalendarStatus(cropType, now);

  // Assess daylight
  const daylightAssessment = assessDaylightStatus(latitude, longitude, now, 2); // min 2 hours

  // Combine assessments
  // Rule 1: If calendar says "out_of_season", that's terminal
  if (calendarAssessment.status === 'out_of_season') {
    return {
      status: 'out_of_season',
      reason: calendarAssessment.reason,
      details: {
        weather: weatherData ? `${Math.round(getRecentRain(weatherData))} mm pluie 7j, sol ${getHumidityLevel(weatherData)}` : '(hors ligne)',
        calendar: calendarAssessment.reason,
        daylight: daylightAssessment.reason,
      },
    };
  }

  // Rule 2: If daylight is insufficient, recommend "soon" (wait for tomorrow)
  if (!daylightAssessment.recommended) {
    return {
      status: 'soon',
      reason: `Trop tard aujourd'hui. ${daylightAssessment.reason}. Reprendre demain.`,
      details: {
        weather: weatherData ? `${Math.round(getRecentRain(weatherData))} mm pluie 7j, sol ${getHumidityLevel(weatherData)}` : '(hors ligne)',
        calendar: calendarAssessment.reason,
        daylight: daylightAssessment.reason,
      },
    };
  }

  // Rule 3: Weather-based recommendation
  if (!weatherData) {
    // No weather data (offline): be conservative
    return {
      status: 'soon',
      reason: `Pas de données météo. Climat connu? ${calendarAssessment.reason}. Vérifier sur place.`,
      details: {
        weather: '(hors ligne)',
        calendar: calendarAssessment.reason,
        daylight: daylightAssessment.reason,
      },
    };
  }

  const rain7d = getRecentRain(weatherData);
  const humidity = getHumidityLevel(weatherData);

  // Optimal: recent rain (5-25 mm) + moderate humidity + accessible crop + good daylight
  if (rain7d >= 5 && rain7d <= 25 && humidity === 'modérée') {
    return {
      status: 'now',
      reason: `Maintenant. ${Math.round(rain7d)} mm pluie 7j, sol ${humidity}, ${calendarAssessment.reason.toLowerCase()}, ${daylightAssessment.reason.toLowerCase()}`,
      details: {
        weather: `${Math.round(rain7d)} mm pluie 7j, sol ${humidity} — conditions optimales`,
        calendar: calendarAssessment.reason,
        daylight: daylightAssessment.reason,
      },
    };
  }

  // Sub-optimal but acceptable: light rain or dry, but accessible
  if (rain7d > 0 && rain7d < 5) {
    return {
      status: 'now',
      reason: `Possible. ${Math.round(rain7d)} mm pluie récente, sol ${humidity}. ${calendarAssessment.reason.toLowerCase()}.`,
      details: {
        weather: `${Math.round(rain7d)} mm pluie 7j, sol ${humidity}`,
        calendar: calendarAssessment.reason,
        daylight: daylightAssessment.reason,
      },
    };
  }

  // Too much rain: wait for drainage
  if (rain7d > 25) {
    return {
      status: 'soon',
      reason: `Trop d'eau récente (${Math.round(rain7d)} mm 7j). Attendre drainage.`,
      details: {
        weather: `${Math.round(rain7d)} mm pluie 7j, sol ${humidity} — trop humide`,
        calendar: calendarAssessment.reason,
        daylight: daylightAssessment.reason,
      },
    };
  }

  // Very dry: possible, but not optimal
  if (rain7d === 0 && humidity === 'très sec') {
    return {
      status: 'soon',
      reason: `Sol très sec. Attendre une pluie. ${calendarAssessment.reason.toLowerCase()}.`,
      details: {
        weather: `Zéro pluie, sol très sec — peu optimal`,
        calendar: calendarAssessment.reason,
        daylight: daylightAssessment.reason,
      },
    };
  }

  // Fallback: conditions acceptable
  return {
    status: 'now',
    reason: `Maintenant. Conditions acceptables. ${calendarAssessment.reason.toLowerCase()}.`,
    details: {
      weather: `Sol ${humidity}`,
      calendar: calendarAssessment.reason,
      daylight: daylightAssessment.reason,
    },
  };
}

/**
 * Helper: extract recent rainfall in mm from weather data.
 */
function getRecentRain(weatherData: WeatherData | null): number {
  if (!weatherData || !weatherData.daily || !weatherData.daily.precipitation_sum) {
    return 0;
  }
  const precip = weatherData.daily.precipitation_sum;
  return precip.slice(-7).reduce((a: number, b: number) => a + b, 0);
}

/**
 * Helper: assess soil humidity level (categorical).
 */
function getHumidityLevel(weatherData: WeatherData | null): string {
  if (!weatherData || !weatherData.hourly || !weatherData.hourly.soil_moisture_0_to_1cm) {
    return 'inconnue';
  }
  const moisture = weatherData.hourly.soil_moisture_0_to_1cm;
  const avg = moisture.slice(-24).reduce((a: number, b: number) => a + b, 0) / Math.min(24, moisture.length);

  if (avg < 0.1) return 'très sec';
  if (avg < 0.15) return 'sec';
  if (avg < 0.25) return 'modérée';
  if (avg < 0.3) return 'humide';
  return 'saturé';
}

/**
 * Export for React component usage.
 */
export { WeatherData } from './weather';
export { CropType } from './calendar';
export { DaylightInfo } from './daylight';
