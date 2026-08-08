/**
 * useGPSSession — hook d'orchestration GPS + DB
 * Gère le cycle de vie session (start, pause, resume, end) et persiste les TrackPoints.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GPSSession, SessionState, RealGeolocationProvider, type GeolocationFix } from '../gps';
import { TreasureDB, getDatabase } from '../db/schema';
import { Session, UUID, LonLat } from '../db/types';
import { generateUUID } from '../lib/uuid';

export interface useGPSSessionOptions {
  enabled?: boolean;
  gapThresholdMs?: number;
  batchSize?: number;
}

export interface GPSSessionData {
  sessionId: UUID | null;
  state: SessionState;
  currentPosition: { coord: LonLat; accuracyM: number; heading?: number } | null;
  sessionLabel: string | null;
  isRecording: boolean;
  trackPointCount: number;
}

export function useGPSSession(options: useGPSSessionOptions = {}) {
  const { enabled = true, gapThresholdMs = 30000, batchSize = 20 } = options;

  const dbRef = useRef<TreasureDB>(getDatabase());
  const gpsSessionRef = useRef<GPSSession | null>(null);
  const geolocationProviderRef = useRef<RealGeolocationProvider | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sessionIdRef = useRef<UUID | null>(null);
  const trackPointCountRef = useRef<number>(0);
  const sessionStateRef = useRef<SessionState>('idle');

  const [sessionData, setSessionData] = useState<GPSSessionData>({
    sessionId: null,
    state: 'idle',
    currentPosition: null,
    sessionLabel: null,
    isRecording: false,
    trackPointCount: 0,
  });

  // Start a new session
  const startSession = useCallback(
    async (label?: string): Promise<UUID | null> => {
      if (!enabled || sessionData.state !== 'idle') return null;

      try {
        // Create session in DB
        const sessionId: UUID = generateUUID();
        const session: Session = {
          id: sessionId,
          startedAt: new Date().toISOString(),
          label: label || undefined,
          parcels: [],
          deviceId: 'default-device', // TODO: generate unique deviceId
          updatedAt: new Date().toISOString(),
          deleted: false,
        };

        await dbRef.current.sessions.add(session);
        sessionIdRef.current = sessionId;

        // Initialize GPS session
        gpsSessionRef.current = new GPSSession(dbRef.current, sessionId, {
          gapThresholdMs,
          batchSize,
        });

        await gpsSessionRef.current.start();
        sessionStateRef.current = 'active';

        // Initialize geolocation provider
        geolocationProviderRef.current = new RealGeolocationProvider();

        // Watch position (using callback refs to avoid stale closures)
        watchIdRef.current = geolocationProviderRef.current.watch(
          (fix: GeolocationFix) => {
            // Use sessionStateRef instead of sessionData.state to avoid stale closure
            if (gpsSessionRef.current && sessionStateRef.current === 'active') {
              (async () => {
                try {
                  const coord: LonLat = [fix.longitude, fix.latitude];
                  await gpsSessionRef.current!.recordFix({
                    at: new Date(fix.timestamp).toISOString(),
                    coord,
                    accuracyM: fix.accuracy,
                    altitudeM: fix.altitude,
                    speedMs: fix.speed,
                  });
                  trackPointCountRef.current += 1;
                } catch (e) {
                  console.error('Error recording GPS fix:', e);
                }
              })();
            }

            // Update UI with current position
            setSessionData((prev) => ({
              ...prev,
              currentPosition: {
                coord: [fix.longitude, fix.latitude],
                accuracyM: fix.accuracy,
                heading: fix.heading,
              },
              trackPointCount: trackPointCountRef.current,
            }));
          },
          (error) => {
            console.warn('Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );

        setSessionData((prev) => ({
          ...prev,
          sessionId,
          state: 'active',
          sessionLabel: label || null,
          isRecording: true,
        }));

        return sessionId;
      } catch (e) {
        console.error('Failed to start session:', e);
        return null;
      }
    },
    [enabled, sessionData.state, gapThresholdMs, batchSize]
  );

  // Pause session
  const pauseSession = useCallback(async () => {
    if (gpsSessionRef.current && sessionStateRef.current === 'active') {
      gpsSessionRef.current.pause();
      sessionStateRef.current = 'paused';
      setSessionData((prev) => ({
        ...prev,
        state: 'paused',
        isRecording: false,
      }));
    }
  }, []);

  // Resume session
  const resumeSession = useCallback(async () => {
    if (gpsSessionRef.current && sessionStateRef.current === 'paused') {
      gpsSessionRef.current.resume();
      sessionStateRef.current = 'active';
      setSessionData((prev) => ({
        ...prev,
        state: 'active',
        isRecording: true,
      }));
    }
  }, []);

  // End session
  const endSession = useCallback(async () => {
    if (!gpsSessionRef.current || sessionStateRef.current === 'ended') return;

    try {
      // Stop watching position
      if (watchIdRef.current && geolocationProviderRef.current) {
        geolocationProviderRef.current.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // End GPS session
      await gpsSessionRef.current.end();
      sessionStateRef.current = 'ended';

      // Update session endedAt in DB
      if (sessionIdRef.current) {
        const now = new Date().toISOString();
        const session = await dbRef.current.sessions.get(sessionIdRef.current);
        if (session) {
          await dbRef.current.sessions.put({
            ...session,
            endedAt: now,
            updatedAt: now,
          });
        }
      }

      setSessionData((prev) => ({
        ...prev,
        state: 'ended',
        isRecording: false,
      }));

      sessionIdRef.current = null;
      trackPointCountRef.current = 0;
    } catch (e) {
      console.error('Error ending session:', e);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current && geolocationProviderRef.current) {
        geolocationProviderRef.current.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...sessionData,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
  };
}
