import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Return a Supabase admin client created with runtime env vars.
 * This ensures Vercel’s runtime variables are used instead of the
 * build-time stub.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('🚨 Missing Supabase admin environment variables at runtime.');
    throw new Error('Supabase admin environment variables are missing.');
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

// Optional default export for convenience
export const supabaseAdmin = getSupabaseAdmin();
export default supabaseAdmin;
