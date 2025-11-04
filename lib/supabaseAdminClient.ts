import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazily create a Supabase admin client using runtime env vars.
 * Returns null during build (so Next.js can still compile).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('⚠️ Supabase admin env vars not available (build or missing).');
    return null;
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

// Do not call getSupabaseAdmin() at import time — keep lazy
export default getSupabaseAdmin;
