import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase public client at runtime so Vercel’s
 * environment variables are always picked up.
 */
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('🚨 Missing Supabase public environment variables at runtime.');
    throw new Error('Supabase public environment variables are missing.');
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
 * Convenience export: you can still import { supabase } if you
 * don’t need to re-instantiate each time (e.g. client-side code).
 */
export const supabase = getSupabaseClient();
export default supabase;
