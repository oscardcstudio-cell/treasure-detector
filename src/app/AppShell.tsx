/**
 * AppShell — Main application layout, design « glossy claymorphism ».
 * Structure et classes : design/mockup-hub-v1.html (menu),
 * design/mockup-terrain-v1.html (carte, chrome sombre),
 * design/mockup-finds-v1.html (trouvailles). Voir src/design/clay.css.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import zoneConfig from '../../config/zone.json';
import MapView from '../map/MapView';
import Curtain from '../map/Curtain';
import { HistoricLayerId } from '../map/layers';
import { QuickActions } from '../finds';
import { FindsList } from '../finds';
import { FindForm } from '../finds/FindForm';
import { DigsLayer } from '../finds/DigsLayer';
import { TracesLayer } from '../gps/TracesLayer';
import { StorageMeter } from '../backup';
import { getDatabase } from '../db/schema';
import { DigPoint, Find } from '../db/types';
import { isSupabaseReady } from '../lib/supabase';
import { useGPSSession } from './useGPSSession';
import { useMapIntegration } from './useMapIntegration';
import { SyncBadge } from '../sync/SyncBadge';
import { setupNetworkListener, drainSyncQueue } from '../sync';
import { initPMTilesProtocol, startAutoPrefetch, AutoPrefetchStatus } from '../geo';
import { DownloadZone } from '../geo/DownloadZone';
import { OutingWindow } from '../window/OutingWindow';
import { ZonesLayer } from '../zones';
import { FoncierLayer, LegalBanner } from '../foncier';
import { AuthGate } from '../auth/AuthGate';

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

  // Creusages/trouvailles : données réelles + version pour rafraîchir liste et carte
  const [digs, setDigs] = useState<DigPoint[]>([]);
  const [findsMap, setFindsMap] = useState<Map<string, Find>>(new Map());
  const [dataVersion, setDataVersion] = useState(0);
  const [activeFindDig, setActiveFindDig] = useState<DigPoint | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Charger creusages + trouvailles depuis la base locale
  useEffect(() => {
    (async () => {
      try {
        const db = getDatabase();
        const [allDigs, allFinds] = await Promise.all([db.digPoints.toArray(), db.finds.toArray()]);
        setDigs(allDigs.filter((d) => !d.deleted).sort((a, b) => b.at.localeCompare(a.at)));
        setFindsMap(new Map(allFinds.filter((f) => !f.deleted).map((f) => [f.digPointId, f])));
      } catch (e) {
        console.error('Failed to load digs/finds:', e);
      }
    })();
  }, [dataVersion]);

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
        const digPoint: DigPoint = { ...dig, id: crypto.randomUUID(), updatedAt: new Date().toISOString(), deviceId: 'default' };
        await db.digPoints.add(digPoint);
        setDataVersion((v) => v + 1);
        if (dig.outcome === 'trouvaille') {
          // Ouvrir la fiche d'annotation tout de suite (quoi, matière, note)
          setActiveFindDig(digPoint);
        } else {
          showToast('Creusage enregistré — point posé sur la carte');
        }
      } catch (e) {
        console.error('Failed to save dig point:', e);
        showToast('Échec de l’enregistrement');
      }
    },
    [showToast]
  );

  const handleFindSave = useCallback(
    async (find: Omit<Find, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'deleted'>) => {
      if (!activeFindDig) return;
      const db = getDatabase();
      try {
        const full: Find = { ...find, id: crypto.randomUUID(), updatedAt: new Date().toISOString(), deviceId: 'default' };
        await db.finds.add(full);
        await db.digPoints.update(activeFindDig.id, { findId: full.id, updatedAt: new Date().toISOString() });
        setActiveFindDig(null);
        setDataVersion((v) => v + 1);
        showToast('Trouvaille enregistrée — point posé sur la carte');
      } catch (e) {
        console.error('Failed to save find:', e);
        showToast('Échec de l’enregistrement');
      }
    },
    [activeFindDig, showToast]
  );

  const handleDelete = useCallback(async (id: string, type: 'dig' | 'find') => {
    const db = getDatabase();
    try {
      // Suppression logique (jamais de DELETE réel — invariant sync)
      if (type === 'dig') {
        await db.digPoints.update(id, { deleted: true, updatedAt: new Date().toISOString() });
      } else {
        await db.finds.update(id, { deleted: true, updatedAt: new Date().toISOString() });
      }
      setDataVersion((v) => v + 1);
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  }, []);

  // La météo relit la position à chaque tick GPS : arrondir à ~100 m pour que
  // la carte « Fenêtre de sortie » ne se recalcule pas en boucle (retour terrain :
  // la section pompait/compressait sans arrêt, rendant le menu incliquable).
  const outingPosition = useMemo<[number, number] | undefined>(() => {
    const c = gpsSession.currentPosition?.coord;
    if (!c) return undefined;
    return [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gpsSession.currentPosition ? Math.round(gpsSession.currentPosition.coord[0] * 1000) : null,
    gpsSession.currentPosition ? Math.round(gpsSession.currentPosition.coord[1] * 1000) : null,
  ]);

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
            {viewMode === 'standard' && <MapView onMapReady={setMapRef} />}
            {viewMode === 'curtain' && <Curtain layerLeft={curtainLeft} layerRight={curtainRight} />}
            {showZonesLayer && mapRef && <ZonesLayer map={mapRef} isVisible={showZonesLayer} />}
            {showFoncierLayer && mapRef && <FoncierLayer map={mapRef} isVisible={showFoncierLayer} />}
            {/* Creusages/trouvailles + quadrillage des passages précédents */}
            {mapRef && <DigsLayer map={mapRef} refreshKey={dataVersion} />}
            {mapRef && <TracesLayer map={mapRef} refreshKey={dataVersion + (sessionRunning ? 0 : 1000)} />}
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
            <FindsList digs={digs} finds={findsMap} onDelete={handleDelete} />
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

            {/* Fenêtre de sortie — position arrondie (~100 m) pour éviter le
                recalcul en boucle à chaque tick GPS, hauteur mini stable */}
            {outingPosition && (
              <div className="card card--wide reveal">
                <span className="badge badge--sortie" aria-hidden="true">
                  <img src="/icons/fluent-3d/carte.png" alt="" />
                </span>
                <div className="card-main" style={{ minHeight: '72px' }}>
                  <p className="card-title">Fenêtre de sortie</p>
                  <OutingWindow position={outingPosition} />
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
                {isSupabaseReady() ? (
                  <AuthGate />
                ) : (
                  <p className="card-body" style={{ margin: 0 }}>
                    Sauvegarde en ligne pas encore branchée — tes sorties restent
                    enregistrées sur ce téléphone (et dans les sauvegardes locales).
                    Rien à faire de ton côté pour l’instant.
                  </p>
                )}
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

      {/* ── Fiche trouvaille (après appui « Trouvaille ») ── */}
      {activeFindDig && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'oklch(14% 0.016 265 / 0.65)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--td-bg)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              padding: 'var(--space-4)',
              paddingBottom: 'calc(var(--space-4) + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <FindForm
              digPointId={activeFindDig.id}
              onFindSave={handleFindSave}
              onClose={() => {
                setActiveFindDig(null);
                showToast('Creusage gardé — tu pourras annoter depuis Trouvailles');
              }}
            />
          </div>
        </div>
      )}

      {/* ── Toast de confirmation ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 400,
            background: 'var(--td-chrome)',
            color: 'var(--td-chrome-ink)',
            borderRadius: 'var(--radius-pill)',
            padding: '10px 18px',
            fontSize: '0.82rem',
            fontWeight: 700,
            boxShadow: 'var(--shadow-ambient-lg), var(--inset-highlight)',
            whiteSpace: 'nowrap',
            maxWidth: '92vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {toast}
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

    </div>
  );
}
