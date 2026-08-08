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
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Sauvegarde en ligne</h2>

        {user ? (
          // Signed in state
          <div style={styles.signedInContent}>
            <p style={styles.paragraph}>Connecté en tant que :</p>
            <p style={styles.email}>{user.email}</p>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              style={{ ...styles.button, ...styles.buttonSecondary }}
            >
              {isLoading ? 'Déconnexion...' : 'Se déconnecter'}
            </button>
          </div>
        ) : (
          // Signed out state
          <div style={styles.signedOutContent}>
            <p style={styles.paragraph}>
              Tes données sont sauvegardées localement sur le téléphone.
              Connecte-toi pour que tes sorties remontent aussi en ligne.
            </p>
            <input
              type="email"
              placeholder="Ton e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              style={styles.input}
            />
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              style={{ ...styles.button, ...styles.buttonPrimary }}
            >
              {isLoading ? 'Envoi...' : 'Recevoir le lien'}
            </button>
          </div>
        )}

        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.type === 'error' ? styles.messageError : styles.messageSuccess),
            }}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
  },
  card: {
    backgroundColor: 'var(--color-bg-secondary, #f5f5f5)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  heading: {
    fontSize: '18px',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '16px',
    color: 'var(--color-text-primary, #000)',
  },
  paragraph: {
    fontSize: '14px',
    lineHeight: '1.5',
    marginBottom: '12px',
    color: 'var(--color-text-secondary, #666)',
  },
  email: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '16px',
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg-tertiary, #e8e8e8)',
    borderRadius: '4px',
    color: 'var(--color-text-primary, #000)',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '12px',
    fontSize: '16px',
    border: '1px solid var(--color-border, #ccc)',
    borderRadius: '4px',
    boxSizing: 'border-box',
    color: 'var(--color-text-primary, #000)',
    backgroundColor: 'var(--color-bg-input, #fff)',
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    minHeight: '48px',
    transition: 'opacity 0.2s',
  },
  buttonPrimary: {
    backgroundColor: 'var(--color-primary, #007AFF)',
    color: '#fff',
  },
  buttonSecondary: {
    backgroundColor: 'var(--color-border, #ccc)',
    color: 'var(--color-text-primary, #000)',
  },
  signedInContent: {
    textAlign: 'center' as const,
  },
  signedOutContent: {},
  message: {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  messageSuccess: {
    backgroundColor: 'var(--color-success-bg, #d4edda)',
    color: 'var(--color-success-text, #155724)',
    border: '1px solid var(--color-success-border, #c3e6cb)',
  },
  messageError: {
    backgroundColor: 'var(--color-error-bg, #f8d7da)',
    color: 'var(--color-error-text, #721c24)',
    border: '1px solid var(--color-error-border, #f5c6cb)',
  },
};
