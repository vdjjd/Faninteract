import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin (service role) client using runtime env vars.
 * Returns null during build so Next.js can still compile safely.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('⚠️ Supabase admin environment variables missing or unavailable at runtime.');
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

/** Export for convenience (not instantiated at import time) */
export default getSupabaseAdmin;
