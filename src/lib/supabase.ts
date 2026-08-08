import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Supabase is disabled. Set .env.local to enable. ' +
    'App continues without remote sync.',
  );
} else {
  try {
    supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('[Supabase] Failed to initialize', err);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

export function isSupabaseReady(): boolean {
  return supabase !== null;
}
