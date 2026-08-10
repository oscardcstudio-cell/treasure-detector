/**
 * AuthGate — minimal, non-blocking auth UI
 *
 * Displayed in the Menu tab as a self-contained card.
 * App remains 100% usable offline without connecting.
 * When signed in: shows email + logout button.
 * When signed out: shows email input + "Send link" button.
 *
 * Design: simple, accessible, readable at arm's length in sunlight.
 * Buttons ≥ 48 px (tap target).
 */

import React, { useState, useEffect, type ReactNode } from 'react';
import { signInWithMagicLink, signOut, getCurrentUser, onAuthChange, AuthUser } from './session';

export function AuthGate(): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // On mount, check current auth state and set up listener
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };

    checkAuth();

    // Listen for auth changes
    const unsubscribe = onAuthChange((newUser) => {
      setUser(newUser);
      setEmail(''); // Clear input when auth state changes
      setMessage(null);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer votre e-mail' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const result = await signInWithMagicLink(email);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Un lien a été envoyé à votre e-mail. Cliquez pour vous connecter.',
      });
      setEmail('');
    } else {
      setMessage({
        type: 'error',
        text: `Erreur : ${result.error || 'impossible de se connecter'}`,
      });
    }

    setIsLoading(false);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    const result = await signOut();

    if (!result.success) {
      setMessage({
        type: 'error',
        text: `Erreur : ${result.error || 'impossible de se déconnecter'}`,
      });
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <>
      {user ? (
        // Signed in state
        <div style={{ marginTop: 'var(--space-3)' }}>
          <p className="card-body" style={{ marginBottom: 'var(--space-2)' }}>Connecté en tant que :</p>
          <div className="status-dot-row" style={{ marginBottom: 'var(--space-3)', fontSize: '0.78rem' }}>
            <span className="status-dot status-dot--on" />
            <span style={{ color: 'var(--td-ink)', fontSize: '0.76rem' }}>{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="filter-chip"
            style={{
              width: '100%',
              opacity: isLoading ? 0.55 : 1,
              cursor: isLoading ? 'default' : 'pointer',
            }}
          >
            {isLoading ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      ) : (
        // Signed out state
        <div style={{ marginTop: 'var(--space-3)' }}>
          <p className="card-body" style={{ marginBottom: 'var(--space-3)' }}>
            Tes données sont sauvegardées localement sur le téléphone.
            Connecte-toi pour que tes sorties remontent aussi en ligne.
          </p>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Ton e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="clay-input"
            style={{ marginBottom: 'var(--space-3)' }}
          />
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="btn-pill"
            style={{
              width: '100%',
              opacity: isLoading ? 0.55 : 1,
              cursor: isLoading ? 'default' : 'pointer',
            }}
          >
            {isLoading ? 'Envoi...' : 'Recevoir le lien'}
          </button>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            padding: '8px 12px',
            backgroundColor: message.type === 'error' ? 'oklch(66% 0.2 27 / 0.12)' : 'oklch(90% 0.08 145 / 0.3)',
            color: message.type === 'error' ? 'var(--cat-compte-d)' : 'var(--cat-couches-d)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.76rem',
          }}
        >
          {message.text}
        </div>
      )}
    </>
  );
}
