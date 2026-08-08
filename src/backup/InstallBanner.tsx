/**
 * InstallBanner component.
 * Shows "Install on Home Screen" prompt when the app runs in Safari (not installed).
 * Displayed once, then dismissed for the session.
 * Explains iOS purging behavior honestly.
 */

import React, { useEffect, useState } from 'react';

/**
 * Detect if app is running in standalone mode (installed on home screen).
 */
function isAppInstalled(): boolean {
  // Check if window.navigator.standalone is true (iOS PWA)
  // or if display-mode is 'standalone' or 'fullscreen' (Android PWA)
  const isStandalone = (navigator as any).standalone === true;
  const mediaQuery = window.matchMedia('(display-mode: standalone)').matches;
  const mediaQueryFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;

  return isStandalone || mediaQuery || mediaQueryFullscreen;
}

/**
 * Detect if app is running in Safari (iOS or Mac).
 */
function isSafari(): boolean {
  const ua = navigator.userAgent;
  // Check for Safari but not Chrome (Chrome also includes Safari in UA)
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
}

interface InstallBannerProps {
  dismissKey?: string; // localStorage key for dismissal
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ dismissKey = 'treasure_install_banner_dismissed' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner only if:
    // 1. App is NOT installed (not in standalone mode)
    // 2. App IS running in Safari (iOS or Mac)
    // 3. Banner hasn't been dismissed this session
    const installed = isAppInstalled();
    const safari = isSafari();
    const dismissed = sessionStorage.getItem(dismissKey) === 'true';

    console.log('[InstallBanner]', { installed, safari, dismissed });

    if (!installed && safari && !dismissed) {
      setIsVisible(true);
    }
  }, [dismissKey]);

  const handleDismiss = () => {
    sessionStorage.setItem(dismissKey, 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#fff3cd',
        borderBottom: '2px solid #ffc107',
        padding: '12px 16px',
        fontSize: '14px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1 }}>
        <strong>Installe l'app sur ton écran d'accueil.</strong>
        <br />
        Sinon iOS peut effacer tes données après 7 jours sans utilisation.
      </div>
      <button
        onClick={handleDismiss}
        style={{
          padding: '6px 12px',
          backgroundColor: '#ffc107',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      >
        OK
      </button>
    </div>
  );
};
