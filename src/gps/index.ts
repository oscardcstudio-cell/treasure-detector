/**
 * GPS module public API.
 * Exported from src/gps/index.ts for orchestration by App.tsx.
 *
 * The app orchestrator (T1.x) imports from this file and connects the pieces.
 * No dependencies on App.tsx, src/map/, src/finds/, etc. — pure GPS logic.
 */

// Core classes
export { GPSSession, type SessionState } from './session';
export { computeSweptArea, sweptAreaToGeoJSON, SPEED_THRESHOLD_RATISSE_MS } from './swept';
export { CompassManager, BandGuide, type Band, type CompassReading } from './compass';
export { TargetGuidance, bearingToCompass, type GuidanceData } from './guidance';

// Platform abstraction
export { RealGeolocationProvider, ReplayGeolocationProvider, type GeolocationProvider, type GeolocationFix } from '../platform/geolocation';

// React components
export { SessionHUD, BatteryMonitor, traceToGeoJSON, currentLocationToGeoJSON, accuracyCircleToGeoJSON } from './components/SessionHUD';
export type { SessionHUDProps } from './components/SessionHUD';

// Utilities
export { generateUUID, isValidUUID } from '../lib/uuid';

// Test fixtures (exported for testing, not for production use)
export * from './__tests__/fixtures';
