/**
 * AppShell — Main application layout
 * Combines map, session HUD, quick actions, and navigation tabs
 */

import { useState, useCallback, useEffect } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import zoneConfig from '../../config/zone.json';
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
import { SyncBadge } from '../sync/SyncBadge';
import { setupNetworkListener, drainSyncQueue } from '../sync';
import { initPMTilesProtocol } from '../geo';
import { DownloadZone } from '../geo/DownloadZone';
import { OutingWindow } from '../window/OutingWindow';
import { ZonesLayer } from '../zones';
import { FoncierLayer, LegalBanner } from '../foncier';
import { PresetOverlay } from '../presets/PresetOverlay';
import { AuthGate } from '../auth/AuthGate';
import type { ScoreCell } from '../scoring/types';

type ViewMode = 'standard' | 'curtain';
type TabMode = 'map' | 'finds' | 'menu';

export default function AppShell() {
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [curtainLeft, setCurtainLeft] = useState<HistoricLayerId>('etat-major');
  const [curtainRight, setCurtainRight] = useState<HistoricLayerId>('cassini');
  const [tabMode, setTabMode] = useState<TabMode>('map');
  const [mapRef, setMapRef] = useState<MapLibreMap | null>(null);
  const [showZonesLayer, setShowZonesLayer] = useState(true);
  const [showFoncierLayer, setShowFoncierLayer] = useState(false);
  const [selectedCell, setSelectedCell] = useState<ScoreCell | undefined>();

  // Initialize sync on mount (network listener)
  useEffect(() => {
    (async () => {
      try {
        // Setup network listener for sync queue
        setupNetworkListener();

        // Drain any pending sync items on startup
        await drainSyncQueue();
      } catch (error) {
        console.error('Failed to initialize sync:', error);
      }
    })();
  }, []);

  // GPS session orchestration
  const gpsSession = useGPSSession({ enabled: true });

  // Connect GPS to map
  useMapIntegration({
    map: mapRef,
    sessionId: gpsSession.sessionId,
    currentPosition: gpsSession.currentPosition,
    sessionActive: gpsSession.state === 'active',
  });

  // Initialize PMTiles protocol when map is ready
  useEffect(() => {
    if (!mapRef) return;
    try {
      initPMTilesProtocol(mapRef);
    } catch (error) {
      console.error('Failed to initialize PMTiles protocol:', error);
    }
  }, [mapRef]);

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
      {/* Top controls: view mode selector + sync badge */}
      <div style={{ padding: '8px 12px', background: '#f5f5f5', borderBottom: '1px solid #ddd', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
          onClick={() => setViewMode('standard')}
          style={{
            padding: '10px 14px',
            minHeight: '44px',
            background: viewMode === 'standard' ? '#0d47a1' : '#e0e0e0',
            color: viewMode === 'standard' ? '#fff' : '#222',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: viewMode === 'standard' ? 'bold' : 'normal',
          }}
        >
          Vue standard
        </button>
        <button
          onClick={() => setViewMode('curtain')}
          style={{
            padding: '10px 14px',
            minHeight: '44px',
            background: viewMode === 'curtain' ? '#0d47a1' : '#e0e0e0',
            color: viewMode === 'curtain' ? '#fff' : '#222',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: viewMode === 'curtain' ? 'bold' : 'normal',
          }}
        >
          Rideau
        </button>
        {viewMode === 'curtain' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', flexWrap: 'wrap' }}>
            <label>
              Gauche:
              <select
                value={curtainLeft}
                onChange={(e) => setCurtainLeft(e.target.value as HistoricLayerId)}
                style={{ marginLeft: '4px', fontSize: '14px', padding: '8px', minHeight: '40px' }}
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
                style={{ marginLeft: '4px', fontSize: '14px', padding: '8px', minHeight: '40px' }}
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
        <SyncBadge />
      </div>

      {/* Bandeau légal — visible tant que la couche foncier est active */}
      {showFoncierLayer && <LegalBanner />}

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
            {viewMode === 'standard' && <MapView onMapReady={setMapRef} onScoredCellSelected={setSelectedCell} />}
            {viewMode === 'curtain' && <Curtain layerLeft={curtainLeft} layerRight={curtainRight} />}
            {/* Zones layer toggle (only in map view) */}
            {showZonesLayer && mapRef && <ZonesLayer map={mapRef} isVisible={showZonesLayer} />}
            {/* Foncier layer toggle (only in map view) */}
            {showFoncierLayer && mapRef && <FoncierLayer map={mapRef} isVisible={showFoncierLayer} />}
          </>
        ) : tabMode === 'finds' ? (
          <div style={{ padding: '12px', overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }}>
            <FindsList digs={[]} finds={new Map()} onDelete={async () => {}} />
          </div>
        ) : (
          <div style={{ padding: '12px 12px 32px', background: '#f5f5f5', overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }}>
            {/* Menu tab: settings, offline downloads, outing window, storage */}
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ marginTop: 0 }}>Menu</h2>

              {/* Outing window */}
              {gpsSession.currentPosition && (
                <div style={{ marginBottom: '20px' }}>
                  <OutingWindow
                    position={[gpsSession.currentPosition.coord[0], gpsSession.currentPosition.coord[1]]}
                  />
                </div>
              )}

              {/* Download zone */}
              <div style={{ marginBottom: '20px' }}>
                <h3>Offline</h3>
                <DownloadZone
                  bbox={zoneConfig.bbox as [number, number, number, number]}
                  selectedLayerIds={['plan-ign', 'ortho']}
                  minZoom={10}
                  maxZoom={18}
                />
              </div>

              {/* Storage meter (le composant affiche déjà son propre titre) */}
              <div style={{ marginBottom: '20px' }}>
                <StorageMeter />
              </div>

              {/* Zones layer toggle */}
              <div style={{ marginBottom: '20px' }}>
                <h3>Couches</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showZonesLayer}
                    onChange={(e) => setShowZonesLayer(e.target.checked)}
                  />
                  <span>Zones signalées</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={showFoncierLayer}
                    onChange={(e) => setShowFoncierLayer(e.target.checked)}
                  />
                  <span>Foncier (public / privé / exclu)</span>
                </label>
              </div>

              {/* Auth / Online sync */}
              <AuthGate />
            </div>
          </div>
        )}
      </div>

      {/* Start session — dans le flux (pas en overlay : un bouton flottant
          recouvrait les sélecteurs de couches et le contenu des autres onglets) */}
      {tabMode === 'map' && gpsSession.state === 'idle' && (
        <div style={{ padding: '8px 12px', background: '#f5f5f5', borderTop: '1px solid #ddd' }}>
          <button
            onClick={handleStartSession}
            style={{
              width: '100%',
              padding: '14px',
              background: '#2e7d32',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Démarrer la session
          </button>
        </div>
      )}

      {/* Tab navigation (bottom) */}
      <div style={{ display: 'flex', borderTop: '1px solid #ddd', background: '#f5f5f5', minHeight: '56px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button
          onClick={() => setTabMode('map')}
          style={{
            flex: 1,
            background: tabMode === 'map' ? '#0d47a1' : 'transparent',
            color: tabMode === 'map' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
          }}
        >
          Carte
        </button>
        <button
          onClick={() => setTabMode('finds')}
          style={{
            flex: 1,
            background: tabMode === 'finds' ? '#0d47a1' : 'transparent',
            color: tabMode === 'finds' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
          }}
        >
          Trouvailles
        </button>
        <button
          onClick={() => setTabMode('menu')}
          style={{
            flex: 1,
            background: tabMode === 'menu' ? '#0d47a1' : 'transparent',
            color: tabMode === 'menu' ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
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

      {/* Preset overlay (shows when a cell is selected) */}
      <PresetOverlay
        activeCell={selectedCell}
        resolveContext={{
          soilCondition: undefined,
        }}
        onClose={() => setSelectedCell(undefined)}
      />
    </div>
  );
}
