/**
 * Test fixtures: realistic GPS traces for testing without walking a field.
 *
 * Trace 1: "quadrillage_field.ts"
 * - ~20 minutes of quadrillaged surveying (parallel bands, ~90 cm spacing)
 * - Zone: ~43.574°N / 0.19°E (Armous-et-Cau area)
 * - Includes a 3-minute gap (screen off / network drop)
 * - Covers ~12,000 m² at 0.9 m/s average
 * - Ends with a fast portion (1.5 m/s) to test 'passage_rapide' classification
 *
 * Generated synthetically to be deterministic and reproducible for tests.
 */

import { ReplayTracePoint } from '../../platform/geolocation';

/**
 * Real field quadrillage: ~90 cm bands, ~0.9 m/s (ratisse), with a gap and a fast section.
 * All coordinates in WGS84 (lon/lat).
 */
export function generateQuadrillageTrace(): ReplayTracePoint[] {
  const trace: ReplayTracePoint[] = [];
  let time = new Date('2026-08-08T14:30:00Z').getTime();
  const timeStep = 2000; // 2 seconds between points (simulates real GPS interval)

  const startLat = 43.5740;
  const startLon = 0.1900;
  const bandSpacingDeg = 0.00001; // ~1 m at this latitude
  const sweepLengthDeg = 0.0005; // ~50 m

  // Band 1: first pass (5 bands, moving south)
  for (let band = 0; band < 5; band++) {
    const bandLon = startLon + band * bandSpacingDeg;

    // Sweep along this band
    for (let i = 0; i < 25; i++) {
      const lat = startLat - (i / 24) * sweepLengthDeg;
      trace.push({
        lat,
        lon: bandLon,
        accuracy: 5,
        speed: 0.9, // m/s — ratisse speed
        time,
      });
      time += timeStep;
    }

    // Move to next band (5 meters, ~0.00005 degrees)
    trace.push({
      lat: startLat - sweepLengthDeg,
      lon: bandLon + bandSpacingDeg,
      accuracy: 5,
      speed: 0.5,
      time,
    });
    time += 5000;
  }

  // 3-minute gap: screen goes dark
  time += 3 * 60 * 1000;

  // Resume: Band 2 (perpendicular pass, moving east)
  const resumeLat = startLat - sweepLengthDeg;
  const resumeLon = startLon;

  for (let band = 0; band < 4; band++) {
    const bandLat = resumeLat + band * bandSpacingDeg;

    // Sweep along this band
    for (let i = 0; i < 20; i++) {
      const lon = resumeLon + (i / 19) * sweepLengthDeg;
      trace.push({
        lat: bandLat,
        lon,
        accuracy: 5,
        speed: 0.9,
        time,
      });
      time += timeStep;
    }

    // Move to next band
    trace.push({
      lat: bandLat + bandSpacingDeg,
      lon: resumeLon + sweepLengthDeg,
      accuracy: 5,
      speed: 0.5,
      time,
    });
    time += 5000;
  }

  // Fast return to start (1.5 m/s → passage_rapide)
  const endLat = resumeLat + 3 * bandSpacingDeg;
  const endLon = resumeLon + sweepLengthDeg;

  for (let i = 0; i < 10; i++) {
    const lat = endLat + (i / 9) * (startLat - endLat);
    const lon = endLon + (i / 9) * (startLon - endLon);
    trace.push({
      lat,
      lon,
      accuracy: 5,
      speed: 1.5, // m/s — passage_rapide
      time,
    });
    time += 1000; // faster interval
  }

  return trace;
}

/**
 * Simple out-and-back trace: useful for edge case testing.
 * No gaps, all at ratisse speed.
 */
export function generateSimpleTraceOutAndBack(): ReplayTracePoint[] {
  const trace: ReplayTracePoint[] = [];
  let time = new Date('2026-08-08T14:30:00Z').getTime();
  const timeStep = 1000;

  const startLat = 43.5740;
  const startLon = 0.1900;

  // Out (northward, 100 m)
  for (let i = 0; i < 100; i++) {
    const lat = startLat + (i / 100) * 0.0009;
    trace.push({
      lat,
      lon: startLon,
      accuracy: 5,
      speed: 0.9,
      time,
    });
    time += timeStep;
  }

  // Back (southward)
  for (let i = 100; i >= 0; i--) {
    const lat = startLat + (i / 100) * 0.0009;
    trace.push({
      lat,
      lon: startLon,
      accuracy: 5,
      speed: 0.9,
      time,
    });
    time += timeStep;
  }

  return trace;
}

/**
 * Trace with a large gap: tests segment splitting.
 */
export function generateTraceWithGap(): ReplayTracePoint[] {
  const trace: ReplayTracePoint[] = [];
  let time = new Date('2026-08-08T14:30:00Z').getTime();
  const timeStep = 1000;

  const startLat = 43.5740;
  const startLon = 0.1900;

  // First segment
  for (let i = 0; i < 20; i++) {
    const lat = startLat + (i / 20) * 0.0003;
    trace.push({
      lat,
      lon: startLon,
      accuracy: 5,
      speed: 0.9,
      time,
    });
    time += timeStep;
  }

  // 2-minute gap
  time += 2 * 60 * 1000;

  // Second segment (moved 200 m north)
  for (let i = 0; i < 20; i++) {
    const lat = startLat + 0.0018 + (i / 20) * 0.0003;
    trace.push({
      lat,
      lon: startLon,
      accuracy: 5,
      speed: 0.9,
      time,
    });
    time += timeStep;
  }

  return trace;
}
