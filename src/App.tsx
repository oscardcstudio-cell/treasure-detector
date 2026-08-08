import { useEffect, useState } from 'react';
import { setupLossDetection, setupAutoExport } from './backup';
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

  useEffect(() => {
    (async () => {
      try {
        const db = getDatabase();

        // Setup loss detection callback
        await setupLossDetection(db, (metadata) => {
          console.warn('Data loss detected! Last backup:', metadata);
          setLossDetected(true);
          // TODO: Show UI prompt to restore
        });

        // Setup auto-export on visibility change and beforeunload
        setupAutoExport(db);

        setAppReady(true);
      } catch (e) {
        console.error('Failed to initialize app:', e);
      }
    })();
  }, []);

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
        }}
      >
        <h2>Restauration de données détectée</h2>
        <p>Une perte de données a été détectée. Une sauvegarde existe.</p>
        <button
          onClick={() => setLossDetected(false)}
          style={{
            padding: '12px 24px',
            background: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '12px',
          }}
        >
          Continuer sans restauration
        </button>
      </div>
    );
  }

  return <AppShell />;
}
