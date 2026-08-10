/**
 * Pré-chargement automatique des cartes « autour de moi ».
 *
 * Au démarrage (si en ligne), télécharge en tâche de fond les tuiles IGN
 * dans un rayon d'environ 1 h de marche autour de la position GPS
 * (ou de la maison — centre de config/zone.json — si le GPS ne répond pas).
 * Les tuiles vont dans le cache 'ign-tiles-v1', le même que sert le
 * service worker : la carte devient consultable hors ligne sans action.
 *
 * Garde-fous :
 * - au plus 1 fois par 24 h, sauf si on s'est déplacé de plus de 2 km
 *   depuis le dernier pré-chargement (marqueur localStorage) ;
 * - séquentiel (gentil avec l'IGN), abandonnable, silencieux en cas d'échec.
 */

import zoneConfig from '../../config/zone.json';
import { downloadTiles } from './tiles';

const WALK_RADIUS_M = 5000; // ~1 h de marche
const CORE_RADIUS_M = 2000; // cœur : ortho haute résolution (z17)
const STAMP_KEY = 'treasure_detector_auto_prefetch';
const MIN_INTERVAL_MS = 24 * 3600 * 1000;
const MOVE_THRESHOLD_M = 2000;

/** Plan de téléchargement : couche × zooms × rayon. */
const PREFETCH_PLAN: Array<{ layerId: string; minZoom: number; maxZoom: number; radiusM: number }> = [
  { layerId: 'plan-ignv2', minZoom: 12, maxZoom: 16, radiusM: WALK_RADIUS_M },
  { layerId: 'ortho-current', minZoom: 14, maxZoom: 16, radiusM: WALK_RADIUS_M },
  { layerId: 'ortho-current', minZoom: 17, maxZoom: 17, radiusM: CORE_RADIUS_M },
  { layerId: 'etat-major', minZoom: 12, maxZoom: 15, radiusM: WALK_RADIUS_M },
  { layerId: 'cassini', minZoom: 12, maxZoom: 14, radiusM: WALK_RADIUS_M },
];

export type AutoPrefetchPhase = 'idle' | 'running' | 'done' | 'skipped' | 'error';

export interface AutoPrefetchState {
  phase: AutoPrefetchPhase;
  downloaded: number;
  total: number;
  /** Centre effectivement utilisé ('gps' ou 'maison') */
  centerSource: 'gps' | 'maison' | null;
}

let state: AutoPrefetchState = { phase: 'idle', downloaded: 0, total: 0, centerSource: null };
const listeners = new Set<(s: AutoPrefetchState) => void>();
let started = false;

function setState(patch: Partial<AutoPrefetchState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function getAutoPrefetchState(): AutoPrefetchState {
  return state;
}

export function subscribeAutoPrefetch(listener: (s: AutoPrefetchState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Bbox [minLng, minLat, maxLng, maxLat] d'un disque autour d'un point WGS84. */
export function discBbox(center: [number, number], radiusM: number): [number, number, number, number] {
  const [lng, lat] = center;
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const Δφ = φ2 - φ1;
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180;
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function shouldRun(center: [number, number]): boolean {
  try {
    const raw = localStorage.getItem(STAMP_KEY);
    if (!raw) return true;
    const stamp = JSON.parse(raw) as { lng: number; lat: number; ts: number };
    const moved = distanceM(center, [stamp.lng, stamp.lat]) > MOVE_THRESHOLD_M;
    const stale = Date.now() - stamp.ts > MIN_INTERVAL_MS;
    return moved || stale;
  } catch {
    return true;
  }
}

function markRun(center: [number, number]): void {
  try {
    localStorage.setItem(STAMP_KEY, JSON.stringify({ lng: center[0], lat: center[1], ts: Date.now() }));
  } catch {
    // localStorage plein/indispo : on retentera au prochain lancement
  }
}

/** Position GPS rapide, sinon null (pas de prompt bloquant : timeout court). */
function quickPosition(timeoutMs = 8000): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
    );
  });
}

/**
 * Lance le pré-chargement en tâche de fond. Idempotent (un seul run par session).
 */
export function startAutoPrefetch(): void {
  if (started) return;
  started = true;

  void (async () => {
    if (!navigator.onLine) {
      setState({ phase: 'skipped' });
      return;
    }

    const gps = await quickPosition();
    const center = gps ?? (zoneConfig.center as [number, number]);
    const centerSource = gps ? 'gps' : 'maison';

    if (!shouldRun(center)) {
      setState({ phase: 'skipped', centerSource });
      return;
    }

    setState({ phase: 'running', centerSource, downloaded: 0, total: 0 });

    // Total estimé = somme des passes (downloadTiles rapporte par passe)
    let baseDone = 0;
    try {
      for (const pass of PREFETCH_PLAN) {
        const bbox = discBbox(center, pass.radiusM);
        let passTotal = 0;
        await downloadTiles({
          bbox,
          minZoom: pass.minZoom,
          maxZoom: pass.maxZoom,
          layerIds: [pass.layerId],
          onProgress: (done, total) => {
            passTotal = total;
            setState({ downloaded: baseDone + done, total: baseDone + total });
          },
        });
        baseDone += passTotal;
      }
      markRun(center);
      setState({ phase: 'done' });
    } catch (e) {
      // Réseau coupé en cours de route : ce qui est chargé reste en cache
      console.warn('Pré-chargement autour de moi interrompu:', e);
      setState({ phase: 'error' });
    }
  })();
}
