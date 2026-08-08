/**
 * Geolocation provider abstraction.
 * Decouples the GPS API from the rest of the app, enabling mock/replay implementations for testing.
 *
 * The real implementation uses watchPosition; the replay implementation reads a trace file
 * (GPX or JSON) and emits fixes at accelerated speed, which is what makes the system testable
 * without walking in a field.
 */

export interface GeolocationFix {
  latitude: number;
  longitude: number;
  accuracy: number; // horizontal accuracy in meters
  altitude?: number;
  speed?: number; // m/s
  heading?: number;
  timestamp: number; // Date.now()
}

export interface GeolocationProvider {
  /**
   * Start watching position updates.
   * @param onFix called on each new fix
   * @param onError called on any error
   * @param options optional watchPosition options (timeout, maximumAge, enableHighAccuracy)
   */
  watch(
    onFix: (fix: GeolocationFix) => void,
    onError: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): number; // watchId

  /**
   * Stop watching.
   */
  clearWatch(watchId: number): void;

  /**
   * Get current position once.
   */
  getCurrentPosition(
    onSuccess: (fix: GeolocationFix) => void,
    onError: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): void;
}

/**
 * Real implementation using the browser's Geolocation API.
 */
export class RealGeolocationProvider implements GeolocationProvider {
  watch(
    onFix: (fix: GeolocationFix) => void,
    onError: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): number {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { coords, timestamp } = position;
        onFix({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude || undefined,
          speed: coords.speed || undefined,
          heading: coords.heading || undefined,
          timestamp: timestamp || Date.now(),
        });
      },
      onError,
      options ?? {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
    return watchId;
  }

  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  }

  getCurrentPosition(
    onSuccess: (fix: GeolocationFix) => void,
    onError: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { coords, timestamp } = position;
        onSuccess({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude || undefined,
          speed: coords.speed || undefined,
          heading: coords.heading || undefined,
          timestamp: timestamp || Date.now(),
        });
      },
      onError,
      options ?? {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }
}

/**
 * Replay implementation: reads a trace (GPX or JSON) and emits fixes at accelerated speed.
 * This is the only way to make T1.3 and T3.3 testable without walking a field.
 *
 * The speed multiplier lets you replay a 20-minute trace in ~100 ms for tests.
 */
export interface ReplayTracePoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: number; // Unix timestamp or ISO string
  speed?: number; // m/s
  accuracy?: number; // meters, defaults to 5
}

export class ReplayGeolocationProvider implements GeolocationProvider {
  private trace: ReplayTracePoint[] = [];
  private speedMultiplier: number;
  private listeners: Map<number, (fix: GeolocationFix) => void> = new Map();
  private errors: Map<number, (error: GeolocationPositionError) => void> = new Map();
  private watchIdCounter = 1;
  private playbackTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private baseTimestamp: number = 0;

  constructor(trace: ReplayTracePoint[], speedMultiplier: number = 100) {
    this.trace = trace;
    this.speedMultiplier = speedMultiplier;
    this.baseTimestamp = trace[0]?.time || Date.now();
  }

  watch(
    onFix: (fix: GeolocationFix) => void,
    onError: (error: GeolocationPositionError) => void,
    _options?: PositionOptions
  ): number {
    const watchId = this.watchIdCounter++;
    this.listeners.set(watchId, onFix);
    this.errors.set(watchId, onError);

    // Start playback
    this.playTrace(watchId);

    return watchId;
  }

  clearWatch(watchId: number): void {
    this.listeners.delete(watchId);
    this.errors.delete(watchId);
    const timeout = this.playbackTimeouts.get(watchId);
    if (timeout) {
      clearTimeout(timeout);
      this.playbackTimeouts.delete(watchId);
    }
  }

  getCurrentPosition(
    onSuccess: (fix: GeolocationFix) => void,
    _onError: (error: GeolocationPositionError) => void,
    _options?: PositionOptions
  ): void {
    // Return the first point
    if (this.trace.length > 0) {
      onSuccess(this.tracePointToFix(this.trace[0]!));
    }
  }

  private playTrace(watchId: number): void {
    const onFix = this.listeners.get(watchId);
    if (!onFix) return;

    let previousTime = this.baseTimestamp;
    let pointIndex = 0;

    const playNext = () => {
      if (pointIndex >= this.trace.length) return;

      const point = this.trace[pointIndex]!;

      const pointTime = point.time ?? (previousTime + 1000);

      // Delay between points, scaled by speed multiplier
      let delayMs = 0;
      if (pointIndex > 0) {
        const timeDiff = pointTime - previousTime;
        delayMs = timeDiff / this.speedMultiplier;
      }

      const timeout = setTimeout(() => {
        onFix(this.tracePointToFix(point!));
        previousTime = pointTime;
        pointIndex++;
        playNext();
      }, delayMs);

      this.playbackTimeouts.set(watchId, timeout);
    };

    playNext();
  }

  private tracePointToFix(point: ReplayTracePoint): GeolocationFix {
    return {
      latitude: point.lat,
      longitude: point.lon,
      accuracy: point.accuracy ?? 5,
      altitude: point.ele,
      speed: point.speed,
      timestamp: point.time ?? Date.now(),
    };
  }
}
