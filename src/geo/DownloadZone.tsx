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
    <div className="download-zone">
      <h3>Télécharger la zone offline</h3>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      {quota && (
        <div className="quota-info">
          <p>
            Quota: {((quota.usage / 1024 / 1024).toFixed(1))} /{' '}
            {((quota.quota / 1024 / 1024).toFixed(1))} Mo ({quota.percentUsed.toFixed(1)}%)
          </p>
          <div className="quota-bar">
            <div
              className="quota-fill"
              style={{
                width: `${Math.min(quota.percentUsed, 100)}%`,
                backgroundColor: quota.percentUsed > 80 ? '#ef4444' : '#3b82f6',
              }}
            />
          </div>
          {quota.percentUsed > 80 && (
            <button type="button" onClick={handleClearCache} className="button-secondary">
              Vider le cache
            </button>
          )}
        </div>
      )}

      {state === 'idle' && (
        <button type="button" onClick={handleEstimate} className="button-primary">
          Estimer la taille
        </button>
      )}

      {state === 'estimating' && <p>Estimation en cours...</p>}

      {state === 'ready' && estimate && (
        <div className="estimate-info">
          <p>
            <strong>{estimate.totalTiles} tuiles</strong> ×{' '}
            <strong>{selectedLayerIds.length} couches</strong> ={' '}
            <strong>{estimate.estimatedSizeMb.toFixed(1)} Mo</strong>
          </p>
          <div className="button-group">
            <button type="button" onClick={handleDownload} className="button-primary">
              Télécharger
            </button>
            <button type="button" onClick={() => setState('idle')} className="button-secondary">
              Annuler
            </button>
          </div>
        </div>
      )}

      {state === 'downloading' && (
        <div className="progress-info">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
          <p>
            {downloaded} / {total} tuiles ({progressPercent}%)
          </p>
          <button type="button" onClick={handleCancel} className="button-secondary">
            Annuler le téléchargement
          </button>
        </div>
      )}

      {state === 'complete' && (
        <div className="success-banner">
          <p>Téléchargement terminé. Vous pouvez maintenant utiliser la carte hors ligne.</p>
        </div>
      )}

      {state === 'error' && (
        <button type="button" onClick={() => setState('idle')} className="button-secondary">
          Réessayer
        </button>
      )}

      <div className="help-text">
        <p>Les tuiles seront téléchargées dans le cache du navigateur (mode offline).</p>
        <p>Zoom: {minZoom}–{maxZoom}</p>
        <p>Couches: {selectedLayerIds.join(', ')}</p>
      </div>
    </div>
  );
};
