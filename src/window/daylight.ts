/**
 * Daylight calculation: sunrise and sunset times for the current location.
 *
 * Used to size a prospecting outing: how many hours of daylight remain?
 * This is local computation, no API calls.
 *
 * Algorithm: simplified NOAA sunrise/sunset formula, accurate to ±2 minutes.
 * Reference: https://gml.noaa.gov/grad/solcalc/
 *
 * Reference: PLAN.md §1.6, §9.3
 */

/**
 * Simplified NOAA sunrise/sunset formula.
 * Computes sunrise and sunset times for a given date and location.
 *
 * @param latitude decimal degrees (e.g., 43.5742)
 * @param longitude decimal degrees (e.g., 0.1908)
 * @param date date to compute for (local date, not UTC)
 * @returns { sunrise, sunset } both as Date objects in local time
 */
export function computeSunriseSunset(
  latitude: number,
  longitude: number,
  date: Date
): { sunrise: Date; sunset: Date } {
  // Day of year (1-366)
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const daysFromJan1 = Math.floor((date.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const dayOfYear = daysFromJan1 + 1;

  // Fractional year in radians
  const gamma = (2 * Math.PI * (dayOfYear - 1)) / 365.25;

  // Solar declination angle (radians)
  const decl =
    0.37837 * Math.sin(2 * Math.atan(0.9671 * Math.tan(gamma))) -
    0.2169 * Math.sin(gamma);

  // Equation of time (minutes)
  const eot =
    229.18 * (0.017029 * Math.sin(gamma) - 0.12555 * Math.cos(gamma) - 0.04973 * Math.sin(2 * gamma) + 0.03835 * Math.cos(2 * gamma));

  // Standard meridian for the timezone
  // Simplified: use longitude directly (not exact but close enough for prospecting)
  const timezoneOffset = date.getTimezoneOffset();
  const tzMeridian = (timezoneOffset / 60) * 15; // degrees

  // Hour angle for sunrise/sunset (radians)
  const latRad = (latitude * Math.PI) / 180;
  const cosH =
    -Math.tan(latRad) * Math.tan(decl) - (Math.sin(0.8333 * Math.PI) / 180) / (Math.cos(latRad) * Math.cos(decl));

  // Clamp to [-1, 1] to avoid NaN in Math.acos
  if (cosH > 1) {
    // Sun never rises (polar night)
    return {
      sunrise: new Date(date.getTime()),
      sunset: new Date(date.getTime()),
    };
  }
  if (cosH < -1) {
    // Sun never sets (polar day)
    return {
      sunrise: new Date(date.getTime()),
      sunset: new Date(date.getTime()),
    };
  }

  const h = (Math.acos(cosH) * 180) / Math.PI;

  // Compute UTC time in minutes since midnight
  const approxTransit = 720 + 4 * (longitude - tzMeridian) - eot; // minutes
  const sunriseUTC = approxTransit - 4 * h; // minutes
  const sunsetUTC = approxTransit + 4 * h; // minutes

  // Convert to local time
  // Apply timezone offset to UTC times
  const sunriseLocal = new Date(date.getTime() + (sunriseUTC - approxTransit + 720) * 60 * 1000);
  const sunsetLocal = new Date(date.getTime() + (sunsetUTC - approxTransit + 720) * 60 * 1000);

  return {
    sunrise: sunriseLocal,
    sunset: sunsetLocal,
  };
}

export interface DaylightInfo {
  /** Sunrise time (local) */
  sunrise: Date;
  /** Sunset time (local) */
  sunset: Date;
  /** Total daylight duration in hours */
  durationHours: number;
  /** Is it currently day? (if computing for now) */
  isDay?: boolean;
  /** Minutes of daylight remaining (if computing for now) */
  minutesRemaining?: number;
}

/**
 * Get daylight information for a location and date.
 *
 * @param latitude latitude (e.g., 43.5742)
 * @param longitude longitude (e.g., 0.1908)
 * @param date date to compute for (default = today)
 * @param now current time for isDay/minutesRemaining computation (default = current time)
 */
export function getDaylightInfo(
  latitude: number,
  longitude: number,
  date = new Date(),
  now = new Date()
): DaylightInfo {
  // Compute sunrise/sunset for the given date
  const { sunrise, sunset } = computeSunriseSunset(latitude, longitude, date);

  // Duration in hours
  const durationMs = sunset.getTime() - sunrise.getTime();
  const durationHours = durationMs / (60 * 60 * 1000);

  // If computing for today, also compute current daylight status
  const isSameDay = date.toDateString() === now.toDateString();
  let isDay: boolean | undefined;
  let minutesRemaining: number | undefined;

  if (isSameDay) {
    isDay = now >= sunrise && now <= sunset;
    if (isDay) {
      minutesRemaining = Math.round((sunset.getTime() - now.getTime()) / (60 * 1000));
    }
  }

  return {
    sunrise,
    sunset,
    durationHours,
    isDay,
    minutesRemaining,
  };
}

/**
 * Format time as HH:MM (24-hour format).
 */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Format duration as "Xh Ym" or just "Xh" if less than an hour.
 */
export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Get a summary of daylight for display.
 */
export interface DaylightSummary {
  /** Sunrise time as "HH:MM" */
  sunriseTime: string;
  /** Sunset time as "HH:MM" */
  sunsetTime: string;
  /** Total daylight "Xh Ym" */
  duration: string;
  /** "Xm remaining" if day, "Xh until sunrise" if night */
  status: string;
}

export function summarizeDaylight(
  latitude: number,
  longitude: number,
  date = new Date(),
  now = new Date()
): DaylightSummary {
  const info = getDaylightInfo(latitude, longitude, date, now);

  let status = '';
  if (info.isDay && info.minutesRemaining !== undefined) {
    const fmt = formatDuration(info.minutesRemaining / 60);
    status = `Lumière jusqu'à ${formatTime(info.sunset)} (${fmt} restants)`;
  } else if (!info.isDay && now < info.sunrise) {
    const minsUntil = Math.round((info.sunrise.getTime() - now.getTime()) / (60 * 1000));
    status = `Nuit. Levé du soleil à ${formatTime(info.sunrise)} (+${minsUntil}m)`;
  } else {
    status = 'Nuit totale';
  }

  return {
    sunriseTime: formatTime(info.sunrise),
    sunsetTime: formatTime(info.sunset),
    duration: formatDuration(info.durationHours),
    status,
  };
}

/**
 * Advice for prospecting based on daylight.
 * § 9.3: prospecting requires enough daylight to work safely and complete a meaningful sweep.
 *
 * Heuristic: less than 3 hours of daylight remaining = not worth starting now.
 */
export function assessDaylightStatus(
  latitude: number,
  longitude: number,
  now = new Date(),
  minHours = 3
): { recommended: boolean; reason: string } {
  const info = getDaylightInfo(latitude, longitude, now, now);

  if (!info.isDay) {
    return {
      recommended: false,
      reason: `Nuit (coucher ${formatTime(info.sunset)})`,
    };
  }

  if (info.minutesRemaining === undefined) {
    return {
      recommended: false,
      reason: 'Erreur de calcul de lumière',
    };
  }

  const hoursRemaining = info.minutesRemaining / 60;
  if (hoursRemaining < minHours) {
    return {
      recommended: false,
      reason: `Moins de ${minHours}h de lumière (${formatDuration(hoursRemaining)} restants)`,
    };
  }

  return {
    recommended: true,
    reason: `${formatDuration(hoursRemaining)} de lumière restants (jusqu'à ${formatTime(info.sunset)})`,
  };
}
