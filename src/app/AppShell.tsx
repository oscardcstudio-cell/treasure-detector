/**
 * AppShell — Main application layout, design « glossy claymorphism ».
 * Structure et classes : design/mockup-hub-v1.html (menu),
 * design/mockup-terrain-v1.html (carte, chrome sombre),
 * design/mockup-finds-v1.html (trouvailles). Voir src/design/clay.css.
 */

import { useState, useCallback, useEffect } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import zoneConfig from '../../config/zone.json';
import MapView from '../map/MapView';
import Curtain from '../map/Curtain';
import { HistoricLayerId } from '../map/layers';
import { QuickActions } from '../finds';
import { FindsList } from '../finds';
import { StorageMeter } from '../backup';
import { getDatabase } from '../db/schema';
import { DigPoint } from '../db/types';
import { useGPSSession } from './useGPSSession';
import { useMapIntegration } from './useMapIntegration';
import { SyncBadge } from '../sync/SyncBadge';
import { setupNetworkListener, drainSyncQueue } from '../sync';
import { initPMTilesProtocol, startAutoPrefetch, AutoPrefetchStatus } from '../geo';
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
        setupNetworkListener();
        await drainSyncQueue();
      } catch (error) {
        console.error('Failed to initialize sync:', error);
      }
    })();

    // Cartes « autour de moi » : pré-chargement hors-ligne en tâche de fond
    startAutoPrefetch();
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
    setTabMode('map');
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

  const sessionActive = gpsSession.state === 'active';
  const sessionPaused = gpsSession.state === 'paused';
  const sessionRunning = sessionActive || sessionPaused;
  const isMapTab = tabMode === 'map';

  const stateLabel = sessionActive ? 'Actif' : sessionPaused ? 'Pause' : 'Prêt';
  const stateDotClass = sessionActive
    ? 'hud-state-dot'
    : sessionPaused
      ? 'hud-state-dot hud-state-dot--warn'
      : 'hud-state-dot hud-state-dot--off';

  return (
    <div className="td-app" style={isMapTab ? { background: 'var(--td-chrome-deep)' } : undefined}>
      {/* ── Chrome haut (carte uniquement) : HUD sombre ── */}
      {isMapTab && (
        <div className="hud-top">
          <div className="hud-bar">
            <span className="hud-state">
              <span className={stateDotClass}></span>
              {stateLabel}
            </span>
            <span className="hud-divider"></span>
            <span className="hud-metrics">
              {sessionRunning && gpsSession.currentPosition ? (
                <>
                  <span className="hud-metric">
                    <img src="/icons/fluent-3d/gps.png" alt="" className="hud-metric-icon" />
                    ±{Math.round(gpsSession.currentPosition.accuracyM)} m
                  </span>
                  <span className="hud-metric">
                    {gpsSession.trackPointCount} pts
                  </span>
                </>
              ) : sessionRunning ? (
                <span className="hud-metric">
                  <img src="/icons/fluent-3d/gps.png" alt="" className="hud-metric-icon" />
                  <span className="hud-metric-sub">GPS…</span>
                </span>
              ) : (
                <SyncBadge />
              )}
            </span>
            <span className="hud-controls">
              {!sessionRunning && (
                <button
                  className="hud-btn"
                  type="button"
                  aria-label={viewMode === 'standard' ? 'Passer en mode rideau' : 'Revenir à la vue standard'}
                  onClick={() => setViewMode(viewMode === 'standard' ? 'curtain' : 'standard')}
                  style={viewMode === 'curtain' ? { background: 'oklch(100% 0 0 / 0.25)' } : undefined}
                >
                  <span style={{ display: 'flex', gap: '2px' }}>
                    <span style={{ width: '6px', height: '12px', borderRadius: '2px 0 0 2px', background: 'var(--td-chrome-ink)' }} />
                    <span style={{ width: '6px', height: '12px', borderRadius: '0 2px 2px 0', background: 'var(--td-chrome-ink-soft)', opacity: 0.6 }} />
                  </span>
                </button>
              )}
              {sessionActive && (
                <button className="hud-btn" type="button" aria-label="Mettre en pause" onClick={gpsSession.pauseSession}>
                  <span className="icon-pause"><span></span><span></span></span>
                </button>
              )}
              {sessionPaused && (
                <button className="hud-btn" type="button" aria-label="Reprendre" onClick={gpsSession.resumeSession}>
                  <span className="icon-play"></span>
                </button>
              )}
              {sessionRunning && (
                <button className="hud-btn hud-btn--end" type="button" aria-label="Terminer la session" onClick={gpsSession.endSession}>
                  <span className="icon-stop"></span>
                </button>
              )}
            </span>
          </div>

          {/* Alerte GPS (permission refusée / signal perdu) */}
          {sessionRunning && gpsSession.gpsError && (
            <div className="gps-flag">{gpsSession.gpsError}</div>
          )}

          {/* Mode rideau : choix des deux couches comparées */}
          {viewMode === 'curtain' && (
            <div className="hud-bar" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
              <select
                value={curtainLeft}
                onChange={(e) => setCurtainLeft(e.target.value as HistoricLayerId)}
                aria-label="Couche gauche"
                style={{ flex: 1, minWidth: 0, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--td-chrome-ink)', background: 'oklch(100% 0 0 / 0.1)' }}
              >
                <option value="cassini">Cassini</option>
                <option value="etat-major">État-major</option>
                <option value="ortho-1950-65">Ortho 1950–65</option>
                <option value="ortho-irc">IRC</option>
              </select>
              <select
                value={curtainRight}
                onChange={(e) => setCurtainRight(e.target.value as HistoricLayerId)}
                aria-label="Couche droite"
                style={{ flex: 1, minWidth: 0, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--td-chrome-ink)', background: 'oklch(100% 0 0 / 0.1)' }}
              >
                <option value="cassini">Cassini</option>
                <option value="etat-major">État-major</option>
                <option value="ortho-1950-65">Ortho 1950–65</option>
                <option value="ortho-irc">IRC</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Bandeau légal — visible tant que la couche foncier est active */}
      {showFoncierLayer && isMapTab && <LegalBanner />}

      {/* ── Contenu principal ── */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tabMode === 'map' ? (
          <>
            {viewMode === 'standard' && <MapView onMapReady={setMapRef} onScoredCellSelected={setSelectedCell} />}
            {viewMode === 'curtain' && <Curtain layerLeft={curtainLeft} layerRight={curtainRight} />}
            {showZonesLayer && mapRef && <ZonesLayer map={mapRef} isVisible={showZonesLayer} />}
            {showFoncierLayer && mapRef && <FoncierLayer map={mapRef} isVisible={showFoncierLayer} />}
          </>
        ) : tabMode === 'finds' ? (
          <div className="app-scroll">
            <header className="app-header-icon reveal">
              <span className="page-badge" aria-hidden="true">
                <img src="/icons/fluent-3d/journal.png" alt="" />
              </span>
              <div>
                <h1>Trouvailles</h1>
                <p>Creusages et objets de tes sorties.</p>
              </div>
            </header>
            <FindsList digs={[]} finds={new Map()} onDelete={async () => {}} />
          </div>
        ) : (
          <div className="app-scroll">
            <header className="app-header reveal">
              <h1>Menu</h1>
              <p>Session, cartes hors-ligne et compte.</p>
            </header>

            {/* CTA session */}
            {!sessionRunning && (
              <button className="cta-session reveal" type="button" onClick={handleStartSession}>
                <span className="cta-session-icon" aria-hidden="true"><img src="/icons/fluent-3d/gps.png" alt="" /></span>
                <span className="cta-session-text">
                  <span className="label">Démarrer la session</span>
                  <span className="sub">GPS actif, points de creusage enregistrés en continu.</span>
                </span>
                <span className="cta-session-arrow" aria-hidden="true"></span>
              </button>
            )}

            {/* Fenêtre de sortie */}
            {gpsSession.currentPosition && (
              <div className="card card--wide reveal">
                <span className="badge badge--sortie" aria-hidden="true">
                  <img src="/icons/fluent-3d/carte.png" alt="" />
                </span>
                <div className="card-main">
                  <p className="card-title">Fenêtre de sortie</p>
                  <OutingWindow
                    position={[gpsSession.currentPosition.coord[0], gpsSession.currentPosition.coord[1]]}
                  />
                </div>
              </div>
            )}

            {/* Zone hors-ligne */}
            <div className="card card--wide reveal">
              <span className="badge badge--offline" aria-hidden="true">
                <img src="/icons/fluent-3d/offline-download.png" alt="" />
              </span>
              <div className="card-main">
                <p className="card-title">Zone hors-ligne</p>
                <AutoPrefetchStatus />
                <DownloadZone
                  bbox={zoneConfig.bbox as [number, number, number, number]}
                  selectedLayerIds={['plan-ign', 'ortho']}
                  minZoom={10}
                  maxZoom={18}
                />
              </div>
            </div>

            {/* Stockage */}
            <div className="card card--wide reveal">
              <span className="badge badge--stockage" aria-hidden="true">
                <img src="/icons/fluent-3d/stockage.png" alt="" />
              </span>
              <div className="card-main">
                <p className="card-title">Stockage</p>
                <StorageMeter />
              </div>
            </div>

            {/* Couches */}
            <div className="card card--wide reveal" role="group">
              <span className="badge badge--couches" aria-hidden="true">
                <img src="/icons/fluent-3d/couches-layers.png" alt="" />
              </span>
              <div className="card-main">
                <p className="card-title">Couches</p>
                <p className="card-body">Zones signalées et foncier sur la carte.</p>
                <div className="row-toggle">
                  <span className="row-toggle-label">Zones signalées</span>
                  <button
                    className={showZonesLayer ? 'switch is-on' : 'switch'}
                    type="button"
                    role="switch"
                    aria-checked={showZonesLayer}
                    aria-label="Afficher les zones signalées"
                    onClick={() => setShowZonesLayer(!showZonesLayer)}
                  >
                    <span className="switch-knob"></span>
                  </button>
                </div>
                <div className="row-toggle">
                  <span className="row-toggle-label">Foncier (public / privé)</span>
                  <button
                    className={showFoncierLayer ? 'switch is-on' : 'switch'}
                    type="button"
                    role="switch"
                    aria-checked={showFoncierLayer}
                    aria-label="Afficher le foncier"
                    onClick={() => setShowFoncierLayer(!showFoncierLayer)}
                  >
                    <span className="switch-knob"></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Compte */}
            <div className="card card--wide reveal">
              <span className="badge badge--compte" aria-hidden="true">
                <img src="/icons/fluent-3d/profil-compte.png" alt="" />
              </span>
              <div className="card-main">
                <p className="card-title">Compte</p>
                <AuthGate />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom stack carte : actions rapides / CTA session ── */}
      {isMapTab && (
        <div className="bottom-stack" style={{ paddingTop: 'var(--space-2)', background: 'linear-gradient(0deg, var(--td-chrome-deep), transparent)' }}>
          {sessionActive && gpsSession.currentPosition && (
            <QuickActions
              currentPosition={gpsSession.currentPosition}
              sessionId={gpsSession.sessionId || ''}
              onDigCreated={handleDigCreated}
            />
          )}
          {!sessionRunning && (
            <div className="quick-actions">
              <button className="qa-btn qa-btn--find" type="button" onClick={handleStartSession}>
                Démarrer la session
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom nav ── */}
      <nav className={isMapTab ? 'bottom-nav bottom-nav--chrome' : 'bottom-nav'}>
        <button className={tabMode === 'map' ? 'nav-item is-active' : 'nav-item'} type="button" onClick={() => setTabMode('map')}>
          <span className="nav-icon"><span className="nav-icon-carte"></span></span>
          <span className="nav-label">Carte</span>
        </button>
        <button className={tabMode === 'finds' ? 'nav-item is-active' : 'nav-item'} type="button" onClick={() => setTabMode('finds')}>
          <span className="nav-icon"><span className="nav-icon-trouvailles"></span></span>
          <span className="nav-label">Trouvailles</span>
        </button>
        <button className={tabMode === 'menu' ? 'nav-item is-active' : 'nav-item'} type="button" onClick={() => setTabMode('menu')}>
          <span className="nav-icon"><span className="nav-icon-menu"><span></span><span></span><span></span></span></span>
          <span className="nav-label">Menu</span>
        </button>
      </nav>

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
