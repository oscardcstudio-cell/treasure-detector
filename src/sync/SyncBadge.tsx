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
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 12px',
          background: 'oklch(100% 0 0 / 0.14)',
          color: 'var(--td-chrome-ink-soft)',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.72rem',
          fontWeight: '800',
          fontFamily: 'var(--font-body)',
          minHeight: '28px',
        }}
      >
        Init...
      </div>
    );
  }

  const message = getSyncMessage(status);
  const color = getSyncColor(status);

  const styleMap: Record<string, React.CSSProperties> = {
    green: {
      background: 'var(--cat-couches-m)',
      color: 'oklch(16% 0.03 90)',
    },
    orange: {
      background: 'var(--cat-sortie-m)',
      color: 'oklch(16% 0.03 90)',
    },
    red: {
      background: 'linear-gradient(180deg, oklch(66% 0.2 27), oklch(52% 0.2 25))',
      color: '#fff',
    },
    grey: {
      background: 'oklch(100% 0 0 / 0.14)',
      color: 'var(--td-chrome-ink-soft)',
    },
  };

  const style = styleMap[color] || styleMap.grey;

  return (
    <div
      title={`Sync status: ${message}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 12px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.72rem',
        fontWeight: '800',
        fontFamily: 'var(--font-body)',
        minHeight: '28px',
        ...style,
      }}
    >
      {message}
    </div>
  );
};
