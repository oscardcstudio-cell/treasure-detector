/**
 * AppShell — Main application layout
 * Combines map, session HUD, quick actions, and navigation tabs
 */

import { useState, useCallback } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import MapView from '../map/MapView';
import Curtain from '../map/Curtain';
import { HistoricLayerId } from '../map/layers';
import { SessionHUD } from '../gps';
import { QuickActions } from '../finds';
import { FindsList } from '../finds';
import { StorageMeter } from '../backup';
import { getDatabase } from '../db/schema';
import { DigPoint } from '../db/types';
import { useGPSSession } from './useGPSSession';
import { useMapIntegration } from './useMapIntegration';

type ViewMode = 'standard' | 'curtain';
type TabMode = 'map' | 'finds' | 'menu';

export default function AppShell() {
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [curtainLeft, setCurtainLeft] = useState<HistoricLayerId>('etat-major');
  const [curtainRight, setCurtainRight] = useState<HistoricLayerId>('cassini');
  const [tabMode, setTabMode] = useState<TabMode>('map');
  const [mapRef, setMapRef] = useState<MapLibreMap | null>(null);

  // GPS session orchestration
  const gpsSession = useGPSSession({ enabled: true });

  // Connect GPS to map
  useMapIntegration({
    map: mapRef,
    sessionId: gpsSession.sessionId,
    currentPosition: gpsSession.currentPosition,
    sessionActive: gpsSession.state === 'active',
  });

  const handleStartSession = useCallback(async () => {
    await gpsSession.startSession('Nouvelle prospection');
  }, [gpsSession]);

  const handleDigCreated = useCallback(
    async (dig: Omit<DigPoint, 'id' | 'updatedAt' | 'deviceId'>) => {
      const db = getDatabase();
      try {
        const digPoint = { ...dig, id: crypto.randomUUID(), updatedAt: new Date().toISOString(), deviceId: 'default' };
        await db.digPoints.add(digPoint);
      } catch (e) {
        console.error('Failed to save dig point:', e);
      }
    },
    []
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top controls: view mode selector */}
      <div style={{ padding: '8px 12px', background: '#f5f5f5', borderBottom: '1px solid #ddd', display: 'flex', gap: '8px', zIndex: 100 }}>
        <button
          onClick={() => setViewMode('standard')}
          style={{
            padding: '6px 12px',
            background: viewMode === 'standard' ? '#0066cc' : '#ccc',
            color: viewMode === 'standard' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: viewMode === 'standard' ? 'bold' : 'normal',
          }}
        >
          Vue standard
        </button>
        <button
          onClick={() => setViewMode('curtain')}
          style={{
            padding: '6px 12px',
            background: viewMode === 'curtain' ? '#0066cc' : '#ccc',
            color: viewMode === 'curtain' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: viewMode === 'curtain' ? 'bold' : 'normal',
          }}
        >
          Rideau
        </button>
        {viewMode === 'curtain' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
            <label>
              Gauche:
              <select
                value={curtainLeft}
                onChange={(e) => setCurtainLeft(e.target.value as HistoricLayerId)}
                style={{ marginLeft: '4px', fontSize: '12px', padding: '4px' }}
              >
                <option value="cassini">Cassini</option>
                <option value="etat-major">État-major</option>
                <option value="ortho-1950-65">Ortho 1950–65</option>
                <option value="ortho-irc">IRC</option>
              </select>
            </label>
            <label>
              Droite:
              <select
                value={curtainRight}
                onChange={(e) => setCurtainRight(e.target.value as HistoricLayerId)}
                style={{ marginLeft: '4px', fontSize: '12px', padding: '4px' }}
              >
                <option value="cassini">Cassini</option>
                <option value="etat-major">État-major</option>
                <option value="ortho-1950-65">Ortho 1950–65</option>
                <option value="ortho-irc">IRC</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Session HUD (if session active) */}
      {gpsSession.sessionId && (
        <div style={{ padding: '12px', background: '#e3f2fd', borderBottom: '1px solid #90caf9' }}>
          <SessionHUD
            sessionState={gpsSession.state}
            currentPosition={
              gpsSession.currentPosition
                ? {
                    latitude: gpsSession.currentPosition.coord[1],
                    longitude: gpsSession.currentPosition.coord[0],
                    accuracy: gpsSession.currentPosition.accuracyM,
                    heading: gpsSession.currentPosition.heading,
                    timestamp: Date.now(),
                  }
                : undefined
            }
            pointsRecorded={gpsSession.trackPointCount}
            onPause={gpsSession.pauseSession}
            onResume={gpsSession.resumeSession}
            onEnd={gpsSession.endSession}
          />
        </div>
      )}

      {/* Main content: map (flex: 1) or tab panel */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Show map in map tab mode OR show tab panel content */}
        {tabMode === 'map' ? (
          <>
            {viewMode === 'standard' && <MapView onMapReady={setMapRef} />}
            {viewMode === 'curtain' && <Curtain layerLeft={curtainLeft} layerRight={curtainRight} />}
          </>
        ) : tabMode === 'finds' ? (
          <FindsList digs={[]} finds={new Map()} onDelete={async () => {}} />
        ) : (
          <div style={{ padding: '12px', background: '#f5f5f5', overflowY: 'auto' }}>
            <StorageMeter />
          </div>
        )}
      </div>

      {/* Tab navigation (bottom) */}
      <div style={{ display: 'flex', borderTop: '1px solid #ddd', background: '#f5f5f5', height: '50px' }}>
        <button
          onClick={() => setTabMode('map')}
          style={{
            flex: 1,
            background: tabMode === 'map' ? '#0066cc' : 'transparent',
            color: tabMode === 'map' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Carte
        </button>
        <button
          onClick={() => setTabMode('finds')}
          style={{
            flex: 1,
            background: tabMode === 'finds' ? '#0066cc' : 'transparent',
            color: tabMode === 'finds' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Trouvailles
        </button>
        <button
          onClick={() => setTabMode('menu')}
          style={{
            flex: 1,
            background: tabMode === 'menu' ? '#0066cc' : 'transparent',
            color: tabMode === 'menu' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Menu
        </button>
      </div>

      {/* Quick actions (overlay, only in map tab and session active) */}
      {tabMode === 'map' && gpsSession.state === 'active' && gpsSession.currentPosition && (
        <QuickActions
          currentPosition={gpsSession.currentPosition}
          sessionId={gpsSession.sessionId || ''}
          onDigCreated={handleDigCreated}
        />
      )}

      {/* Start session button (overlay, only if no active session) */}
      {gpsSession.state === 'idle' && (
        <button
          onClick={handleStartSession}
          style={{
            position: 'fixed',
            bottom: '70px',
            left: '12px',
            right: '12px',
            padding: '16px',
            background: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 200,
          }}
        >
          Démarrer la session
        </button>
      )}
    </div>
  );
}
