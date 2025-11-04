import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Safely creates a Supabase public client.
 * Does NOT crash builds or client-side rendering if env vars are missing.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.warn('⚠️ Supabase public environment variables are missing.');
    return null; // <-- no crash, just safe fallback
  }

  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Default export for convenience (runtime safe)
 */
export const supabase =
  getSupabaseClient() ||
  createClient('https://placeholder.supabase.co', 'public-anon-key-placeholder');

export default supabase;
