/**
 * SyncBadge — displays sync status in the top bar
 *
 * Shows:
 * - "Syncing..." (orange) when items pending
 * - "Hors ligne" (red) when offline
 * - "OK" (green) when fully synced
 * - Item counts when pending
 *
 * Updates every 2 seconds or when network status changes.
 */

import React, { useState, useEffect } from 'react';
import { getSyncStatus, getSyncMessage, getSyncColor } from './index';
import type { SyncStatus } from './index';

export const SyncBadge: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    // Initial fetch
    getSyncStatus().then(setStatus);

    // Poll every 2 seconds
    const pollInterval = setInterval(() => {
      getSyncStatus().then(setStatus);
    }, 2000);

    // Listen to network events for immediate updates
    const handleOnline = async () => {
      const newStatus = await getSyncStatus();
      setStatus(newStatus);
    };

    const handleOffline = async () => {
      const newStatus = await getSyncStatus();
      setStatus(newStatus);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!status) {
    return (
      <div
        style={{
          display: 'inline-block',
          padding: '4px 8px',
          background: '#ccc',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
        }}
      >
        Initialisation...
      </div>
    );
  }

  const message = getSyncMessage(status);
  const color = getSyncColor(status);

  const colorMap: Record<string, string> = {
    green: '#4CAF50',
    orange: '#FFA500',
    red: '#f44336',
  };

  return (
    <div
      title={`Sync status: ${message}`}
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        background: colorMap[color] || '#ccc',
        color: '#fff',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        minWidth: '80px',
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  );
};
