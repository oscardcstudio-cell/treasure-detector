/**
 * Composant React : "Télécharger la zone"
 *
 * Affiche :
 * - Estimation du nombre de tuiles et de la taille avant lancement
 * - Barre de progression avec nombre de tuiles
 * - Bouton annuler
 * - Gestion du quota (affichage, dépassement)
 */

import React, { useState, useCallback } from 'react';
import {
  estimateTileDownload,
  downloadTiles,
  getCacheQuotaInfo,
  clearTileCache,
} from './index';
import type { TileDownloadOptions, TileEstimate, CacheQuotaInfo } from './types';

interface DownloadZoneProps {
  /** Bbox à télécharger [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number];
  /** Couches à télécharger (IDs depuis src/map/layers.ts) */
  selectedLayerIds: string[];
  /** Zoom min/max */
  minZoom: number;
  maxZoom: number;
  /** Callback quand le téléchargement est terminé */
  onDownloadComplete?: () => void;
  /** Callback quand une erreur se produit */
  onError?: (error: Error) => void;
}

type DownloadState = 'idle' | 'estimating' | 'ready' | 'downloading' | 'complete' | 'error';

export const DownloadZone: React.FC<DownloadZoneProps> = ({
  bbox,
  selectedLayerIds,
  minZoom,
  maxZoom,
  onDownloadComplete,
  onError,
}) => {
  const [state, setState] = useState<DownloadState>('idle');
  const [estimate, setEstimate] = useState<TileEstimate | null>(null);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [quota, setQuota] = useState<CacheQuotaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Étape 1 : Estimer la taille avant de lancer
  const handleEstimate = useCallback(async () => {
    try {
      setState('estimating');
      setError(null);

      const quotaInfo = await getCacheQuotaInfo();
      setQuota(quotaInfo);

      const est = estimateTileDownload({
        bbox,
        minZoom,
        maxZoom,
        layerIds: selectedLayerIds,
      });
      setEstimate(est);
      setState('ready');

      // Alerter si le quota sera dépassé
      const estimatedBytes = est.estimatedSizeMb * 1024 * 1024;
      if (quotaInfo.available < estimatedBytes) {
        setError(
          `Quota insuffisant : ${(quotaInfo.available / 1024 / 1024).toFixed(1)} Mo disponible, ` +
          `${est.estimatedSizeMb.toFixed(1)} Mo estimé`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(message));
    }
  }, [bbox, minZoom, maxZoom, selectedLayerIds, onError]);

  // Étape 2 : Lancer le téléchargement
  const handleDownload = useCallback(async () => {
    if (!estimate) return;

    try {
      setState('downloading');
      setError(null);
      setDownloaded(0);
      setTotal(estimate.totalTiles * selectedLayerIds.length);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const options: TileDownloadOptions = {
        bbox,
        minZoom,
        maxZoom,
        layerIds: selectedLayerIds,
        signal: controller.signal,
        onProgress: (downloadedCount, totalCount) => {
          setDownloaded(downloadedCount);
          setTotal(totalCount);
        },
      };

      await downloadTiles(options);
      setState('complete');
      onDownloadComplete?.();

      // Auto-reset après 3 secondes
      setTimeout(() => {
        setState('idle');
        setEstimate(null);
        setDownloaded(0);
        setTotal(0);
      }, 3000);
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        setState('ready');
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      abortControllerRef.current = null;
    }
  }, [bbox, minZoom, maxZoom, selectedLayerIds, estimate, onDownloadComplete, onError]);

  // Annuler le téléchargement
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState('ready');
  }, []);

  // Vider le cache
  const handleClearCache = useCallback(async () => {
    try {
      await clearTileCache();
      setQuota(await getCacheQuotaInfo());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, []);

  const progressPercent = total > 0 ? Math.round((downloaded / total) * 100) : 0;

  return (
    <>
      {error && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            padding: '8px 12px',
            backgroundColor: 'oklch(66% 0.2 27 / 0.12)',
            color: 'var(--cat-compte-d)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.76rem',
          }}
        >
          {error}
        </div>
      )}

      {quota && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div className="gauge">
            <div className="gauge-track">
              <div
                className="gauge-fill"
                style={{
                  width: `${Math.min(quota.percentUsed, 100)}%`,
                }}
              />
            </div>
            <div className="gauge-label">
              <span>{(quota.usage / 1024 / 1024).toFixed(1)} / {(quota.quota / 1024 / 1024).toFixed(1)} Mo</span>
              <span>{quota.percentUsed.toFixed(1)}%</span>
            </div>
          </div>
          {quota.percentUsed > 80 && (
            <button
              type="button"
              onClick={handleClearCache}
              className="filter-chip"
              style={{ marginTop: 'var(--space-3)' }}
            >
              Vider le cache
            </button>
          )}
        </div>
      )}

      {state === 'idle' && (
        <button type="button" onClick={handleEstimate} className="btn-pill btn-pill--offline" style={{ width: '100%', marginTop: 'var(--space-4)' }}>
          Estimer la taille
        </button>
      )}

      {state === 'estimating' && (
        <p className="card-body" style={{ marginTop: 'var(--space-3)' }}>
          Estimation en cours...
        </p>
      )}

      {state === 'ready' && estimate && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p className="card-body" style={{ marginBottom: 'var(--space-3)' }}>
            <strong>{estimate.totalTiles} tuiles</strong> × <strong>{selectedLayerIds.length} couches</strong> = <strong>{estimate.estimatedSizeMb.toFixed(1)} Mo</strong>
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" onClick={handleDownload} className="btn-pill btn-pill--offline" style={{ flex: 1 }}>
              Télécharger
            </button>
            <button type="button" onClick={() => setState('idle')} className="filter-chip">
              Annuler
            </button>
          </div>
        </div>
      )}

      {state === 'downloading' && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <div className="gauge">
            <div className="gauge-track">
              <div
                className="gauge-fill"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>
          <p className="card-body" style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            {downloaded} / {total} tuiles ({progressPercent}%)
          </p>
          <button type="button" onClick={handleCancel} className="filter-chip" style={{ width: '100%' }}>
            Annuler le téléchargement
          </button>
        </div>
      )}

      {state === 'complete' && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <p className="card-body">
            Téléchargement terminé. Vous pouvez maintenant utiliser la carte hors ligne.
          </p>
        </div>
      )}

      {state === 'error' && (
        <button type="button" onClick={() => setState('idle')} className="filter-chip" style={{ width: '100%', marginTop: 'var(--space-3)' }}>
          Réessayer
        </button>
      )}

      {(state === 'idle' || state === 'ready') && (
        <p className="card-body" style={{ marginTop: 'var(--space-3)', fontSize: '0.76rem' }}>
          Zoom: {minZoom}–{maxZoom} · Couches: {selectedLayerIds.join(', ')}
        </p>
      )}
    </>
  );
};
