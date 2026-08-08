/**
 * Auth session helpers — email/OTP sign-in via Supabase
 *
 * Provides minimal auth API for local-first app:
 * - `signInWithMagicLink(email)` — send OTP to inbox
 * - `signOut()` — clear session
 * - `getCurrentUser()` — get signed-in user or null
 * - `onAuthChange(callback)` — listen to auth state changes
 * - `isAuthenticated()` — is there an active session?
 *
 * All helpers degrade gracefully if Supabase is not configured.
 * The app remains 100% functional offline without auth — sync just won't run.
 */

import { getSupabaseClient } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Sign in with magic link (OTP via email).
 * User receives a link in their inbox, no password required.
 *
 * @param email Email address
 * @returns { success: true } or { success: false, error: string }
 */
export async function signInWithMagicLink(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      success: false,
      error: 'Supabase not configured',
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Sign out — clear the session.
 *
 * @returns { success: true } or { success: false, error: string }
 */
export async function signOut(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Get the currently signed-in user.
 *
 * @returns user object or null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || 'unknown',
    };
  } catch (err) {
    console.error('[Auth] Error getting current user:', err);
    return null;
  }
}

/**
 * Listen to auth state changes (sign in / sign out / session refresh).
 * Returns an unsubscribe function.
 *
 * @param callback Called with user object (or null if signed out)
 * @returns unsubscribe function
 */
export function onAuthChange(
  callback: (user: AuthUser | null) => void
): (() => void) | null {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Supabase not configured: user stays null forever
    return null;
  }

  try {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || 'unknown',
        });
      } else {
        callback(null);
      }
    });

    // Return unsubscribe function
    return () => subscription.unsubscribe();
  } catch (err) {
    console.error('[Auth] Error setting up auth listener:', err);
    return null;
  }
}

/**
 * Check if user is currently authenticated.
 *
 * @returns true if session exists and is valid
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session !== null;
  } catch (err) {
    console.error('[Auth] Error checking authentication:', err);
    return false;
  }
}
