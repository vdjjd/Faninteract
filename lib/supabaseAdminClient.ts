import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a Supabase admin client created with runtime env vars.
 * Does NOT throw during Next.js build.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // During build, these may be undefined — return null safely
  if (!url || !key) {
    console.warn('⚠️ Supabase admin env vars not available (build or missing).');
    return null;
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Optional convenience client for simple imports,
 * will be null during build and replaced at runtime.
 */
export const supabaseAdmin: SupabaseClient | null = getSupabaseAdmin();

export default supabaseAdmin;
