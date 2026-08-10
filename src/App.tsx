import { useEffect, useState } from 'react';
import {
  setupLossDetection,
  setupAutoExport,
  getInlineBackupJson,
  importBackup,
  loadBackupFile,
  clearBackupMetadata,
} from './backup';
import { getDatabase } from './db/schema';
import AppShell from './app/AppShell';

/**
 * App — Point d'entrée principal
 * 1. Initialise loss detection (pour restauration si crash)
 * 2. Setup auto-export (sauvegarde auto en fin de session)
 * 3. Branche l'orchestration complète (GPS + carte + finds)
 */
export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [lossDetected, setLossDetected] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const inlineBackup = lossDetected ? getInlineBackupJson() : null;

  useEffect(() => {
    (async () => {
      try {
        const db = getDatabase();

        // Setup loss detection callback
        await setupLossDetection(db, (metadata) => {
          console.warn('Data loss detected! Last backup:', metadata);
          setLossDetected(true);
        });

        // Setup auto-export on visibility change and beforeunload
        setupAutoExport(db);

        setAppReady(true);
      } catch (e) {
        console.error('Failed to initialize app:', e);
      }
    })();
  }, []);

  const handleRestoreInline = async () => {
    const json = getInlineBackupJson();
    if (!json) return;
    setRestoring(true);
    setRestoreError(null);
    const result = await importBackup(json);
    setRestoring(false);
    if (result.success) {
      setLossDetected(false);
    } else {
      setRestoreError(result.error ?? 'Restauration impossible');
    }
  };

  const handleRestoreFile = async (file: File) => {
    setRestoring(true);
    setRestoreError(null);
    const loaded = await loadBackupFile(file);
    if (!loaded.success || !loaded.content) {
      setRestoring(false);
      setRestoreError(loaded.error ?? 'Fichier invalide');
      return;
    }
    const result = await importBackup(loaded.content);
    setRestoring(false);
    if (result.success) {
      setLossDetected(false);
    } else {
      setRestoreError(result.error ?? 'Restauration impossible');
    }
  };

  const handleContinueWithout = () => {
    // Sans ça, le dialogue revient à chaque lancement tant que la base est vide
    clearBackupMetadata();
    setLossDetected(false);
  };

  if (!appReady) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Initialisation en cours...</p>
      </div>
    );
  }

  if (lossDetected) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff3cd',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>Données locales absentes</h2>
        <p style={{ margin: '0 0 16px', maxWidth: '420px' }}>
          Une sauvegarde de tes sorties existe mais la base locale est vide (navigateur nettoyé ou appareil changé).
          Tu peux restaurer la sauvegarde ou repartir de zéro.
        </p>
        {restoreError && <p style={{ color: '#c62828', margin: '0 0 12px' }}>{restoreError}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
          {inlineBackup && (
            <button
              onClick={handleRestoreInline}
              disabled={restoring}
              style={{
                padding: '14px 24px',
                background: '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {restoring ? 'Restauration…' : 'Restaurer la sauvegarde'}
            </button>
          )}
          <label
            style={{
              padding: '14px 24px',
              background: '#0d47a1',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Restaurer depuis un fichier…
            <input
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              disabled={restoring}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleRestoreFile(file);
              }}
            />
          </label>
          <button
            onClick={handleContinueWithout}
            disabled={restoring}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#5d4037',
              border: '1px solid #5d4037',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Continuer sans restaurer
          </button>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
