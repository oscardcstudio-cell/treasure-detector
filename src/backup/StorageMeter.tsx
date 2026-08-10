/**
 * StorageMeter component.
 * Displays storage usage, quota, and buttons for manual export/import.
 * Shows breakdown of photos, IndexedDB data, etc.
 */

import React, { useEffect, useState } from 'react';
import { getStorageQuota, formatStorageSize, StorageQuotaInfo } from '../platform/storage';
import { exportDatabase, saveBackupToFile } from './export';
import { loadBackupFile, importBackup } from './restore';
import { getDatabase } from '../db/schema';

interface StorageMeterProps {
  onExportComplete?: (fileName: string) => void;
  onImportComplete?: (count: number) => void;
}

export const StorageMeter: React.FC<StorageMeterProps> = ({ onExportComplete, onImportComplete }) => {
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Refresh quota on mount and periodically
    const refresh = async () => {
      const info = await getStorageQuota();
      setQuota(info);
    };

    refresh();
    const interval = setInterval(refresh, 30000); // every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const db = getDatabase();
      const backupJson = await exportDatabase(db);
      const result = await saveBackupToFile(backupJson);

      if (result.success) {
        setSuccess(`Export réussi: ${result.fileName}`);
        if (onExportComplete) {
          onExportComplete(result.fileName);
        }
      } else {
        setError('Export échoué');
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(`Erreur d'export: ${errorMsg}`);
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const loadResult = await loadBackupFile(file);
        if (!loadResult.success) {
          setError(loadResult.error || 'Fichier invalide');
          return;
        }

        const db = getDatabase();
        const importResult = await importBackup(loadResult.content!, db);

        if (importResult.success) {
          setSuccess(`Import réussi: ${importResult.imported} entités restaurées`);
          if (onImportComplete) {
            onImportComplete(importResult.imported);
          }
        } else {
          setError(importResult.error || 'Import échoué');
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setError(`Erreur d'import: ${errorMsg}`);
        console.error('Import failed:', e);
      } finally {
        setLoading(false);
      }
    };

    input.click();
  };

  const quotaBar = quota ? (
    <div className="gauge">
      <div className="gauge-track">
        <div
          className={`gauge-fill ${quota.percentage > 80 ? 'gauge-fill--danger' : quota.percentage > 50 ? 'gauge-fill--warn' : ''}`}
          style={{ width: `${Math.min(quota.percentage, 100)}%` }}
        />
      </div>
      <div className="gauge-label">
        <span>{formatStorageSize(quota.usage)} sur {formatStorageSize(quota.quota)}</span>
        <span>{quota.percentage.toFixed(0)}%</span>
      </div>
    </div>
  ) : null;

  return (
    <>
      {quotaBar}

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-4)',
        }}
      >
        <button
          onClick={handleExport}
          disabled={loading}
          className="btn-pill btn-pill--offline"
          style={{
            flex: 1,
            opacity: loading ? 0.55 : 1,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Sauvegarde…' : 'Exporter'}
        </button>

        <button
          onClick={handleImportClick}
          disabled={loading}
          className="btn-pill btn-pill--couches"
          style={{
            flex: 1,
            opacity: loading ? 0.55 : 1,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Chargement…' : 'Importer'}
        </button>
      </div>

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

      {success && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            padding: '8px 12px',
            backgroundColor: 'oklch(90% 0.08 145 / 0.3)',
            color: 'var(--cat-couches-d)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.76rem',
          }}
        >
          {success}
        </div>
      )}
    </>
  );
};
