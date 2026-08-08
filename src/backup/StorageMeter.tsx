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
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          marginBottom: '4px',
        }}
      >
        <span>Stockage</span>
        <span>
          {formatStorageSize(quota.usage)} / {formatStorageSize(quota.quota)}
        </span>
      </div>
      <div
        style={{
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(quota.percentage, 100)}%`,
            backgroundColor: quota.percentage > 80 ? '#ff5252' : quota.percentage > 50 ? '#ffb300' : '#4caf50',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div
        style={{
          fontSize: '11px',
          color: '#666',
          marginTop: '4px',
        }}
      >
        {quota.percentage.toFixed(0)}% utilisé
        {quota.percentage > 80 && (
          <span style={{ color: '#ff5252', fontWeight: 'bold' }}> — QUOTA BAS</span>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Stockage</div>

      {quotaBar}

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '12px',
        }}
      >
        <button
          onClick={handleExport}
          disabled={loading}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '12px',
          }}
        >
          {loading ? 'Sauvegarde…' : 'Exporter'}
        </button>

        <button
          onClick={handleImportClick}
          disabled={loading}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '12px',
          }}
        >
          {loading ? 'Chargement…' : 'Importer'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
};
