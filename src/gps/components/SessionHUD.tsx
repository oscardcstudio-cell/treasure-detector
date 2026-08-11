/**
 * Session HUD: displays session state, GPS accuracy, battery, pause/end buttons.
 * Large format for gloved operation in sunlight.
 *
 * This component is INDEPENDENT of the map, finds, or any other module.
 * It renders the state of GPSSession and CompassManager, ready for the orchestrator to integrate.
 */

import React, { useEffect, useState } from 'react';
import { circle as turfCircle } from '@turf/turf';
import { SessionState } from '../session';
import { GeolocationFix } from '../../platform/geolocation';
import { CompassReading } from '../compass';

export interface SessionHUDProps {
  sessionState: SessionState;
  currentPosition?: GeolocationFix;
  heading?: CompassReading;
  pointsRecorded: number;
  batteryPercent?: number;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
}

/**
 * Main HUD component: state indicator, accuracy, battery, buttons.
 * Designed for outdoor use, high contrast, large touch targets.
 */
export const SessionHUD: React.FC<SessionHUDProps> = ({
  sessionState,
  currentPosition,
  heading,
  batteryPercent,
  onPause,
  onResume,
  onEnd,
}) => {
  const [batteryClass, setBatteryClass] = useState<'critical' | 'warning' | 'ok'>('ok');

  useEffect(() => {
    if (batteryPercent !== undefined) {
      if (batteryPercent < 20) {
        setBatteryClass('critical');
      } else if (batteryPercent < 50) {
        setBatteryClass('warning');
      } else {
        setBatteryClass('ok');
      }
    }
  }, [batteryPercent]);

  const stateColor = {
    idle: '#666',
    active: '#4CAF50',
    paused: '#FFA500',
    ended: '#999',
  }[sessionState];

  const stateLabel = {
    idle: 'Arrêtée',
    active: 'Enregistrement',
    paused: 'Pause',
    ended: 'Terminée',
  }[sessionState];

  return (
    <div className="session-hud" style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      {/* State indicator */}
      <div className="state-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <div
          className="state-indicator"
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: stateColor,
            marginRight: '10px',
          }}
        />
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{stateLabel}</span>
      </div>

      {/* Position and accuracy */}
      {currentPosition && (
        <div className="position-row" style={{ marginBottom: '1rem', fontSize: '14px' }}>
          <div>
            Précision: <strong>{currentPosition.accuracy.toFixed(0)} m</strong>
          </div>
          <div>
            Position: <strong>{currentPosition.latitude.toFixed(6)}°N, {currentPosition.longitude.toFixed(6)}°E</strong>
          </div>
        </div>
      )}

      {/* Heading */}
      {heading && (
        <div className="heading-row" style={{ marginBottom: '1rem', fontSize: '14px' }}>
          <div>
            Orientation: <strong>{heading.headingDegrees.toFixed(0)}°</strong>
          </div>
        </div>
      )}

      {/* Compteur de points retiré (retour terrain 2026-08-10 : bruit sans usage) */}

      {/* Battery */}
      {batteryPercent !== undefined && (
        <div
          className="battery-row"
          style={{
            marginBottom: '1rem',
            fontSize: '14px',
            color: batteryClass === 'critical' ? '#d32f2f' : batteryClass === 'warning' ? '#FFA500' : '#333',
            fontWeight: batteryClass !== 'ok' ? 'bold' : 'normal',
          }}
        >
          <div>
            Batterie: <strong>{batteryPercent.toFixed(0)}%</strong>
            {batteryClass === 'critical' && ' ⚠ Critique'}
            {batteryClass === 'warning' && ' ⚠ Faible'}
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="controls-row" style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
        {sessionState === 'active' && (
          <button
            onClick={onPause}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#FFA500',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Pause
          </button>
        )}

        {sessionState === 'paused' && (
          <button
            onClick={onResume}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reprendre
          </button>
        )}

        <button
          onClick={onEnd}
          disabled={sessionState === 'idle' || sessionState === 'ended'}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sessionState === 'idle' || sessionState === 'ended' ? 'not-allowed' : 'pointer',
            opacity: sessionState === 'idle' || sessionState === 'ended' ? 0.5 : 1,
          }}
        >
          Terminer
        </button>
      </div>
    </div>
  );
};

/**
 * Battery monitor component using navigator.getBattery() if available.
 * Falls back to periodic checks.
 */
export const BatteryMonitor: React.FC<{
  onBatteryChange?: (percent: number) => void;
}> = ({ onBatteryChange }) => {
  useEffect(() => {
    let isMounted = true;

    // Try navigator.getBattery() (Battery API, deprecated but still supported in some browsers)
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((battery: any) => {
        const updateBattery = () => {
          if (isMounted) {
            const percent = Math.round(battery.level * 100);
            onBatteryChange?.(percent);
          }
        };

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);

        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      });
    }

    return () => {
      isMounted = false;
    };
  }, [onBatteryChange]);

  return null; // This is a side-effect component, it doesn't render anything
};

/**
 * GeoJSON LineString renderer: converts a trace to renderable GeoJSON.
 * Exported for the map integration layer to consume.
 */
export function traceToGeoJSON(points: Array<{ coord: [number, number] }>): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: points.map((p) => p.coord),
  };
}

/**
 * GeoJSON Point for current location.
 */
export function currentLocationToGeoJSON(fix: GeolocationFix): GeoJSON.Point {
  return {
    type: 'Point',
    coordinates: [fix.longitude, fix.latitude],
  };
}

/**
 * Accuracy circle: a real ground-radius polygon (turf.circle) around the fix,
 * matching the accuracy in meters. A bare Point here would not render on the
 * 'gps-accuracy-layer' line layer (MapLibre ignores geometry/layer type mismatches
 * without erroring) — that silently invisible dot was reported by Oscar as
 * "GPS doesn't seem detected" on 2026-08-10.
 */
export function accuracyCircleToGeoJSON(fix: GeolocationFix): GeoJSON.Feature<GeoJSON.Polygon> {
  const radiusMeters = Math.max(fix.accuracy, 1);
  const circlePolygon = turfCircle([fix.longitude, fix.latitude], radiusMeters / 1000, { steps: 64, units: 'kilometers' });
  return {
    ...circlePolygon,
    properties: {
      accuracy: fix.accuracy,
      timestamp: fix.timestamp,
    },
  };
}
