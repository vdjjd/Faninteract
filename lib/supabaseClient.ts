// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null; // ✅ must be let, not const

/**
 * ✅ Always returns a SINGLE shared Supabase client.
 * Prevents multiple GoTrueClient instances and SSR/client duplication.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  _supabase = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'faninteract-auth-token',
    },
    realtime: {
      params: { eventsPerSecond: 3 },
    },
  });

  // ✅ cache globally in browser (helps during hot reload)
  if (typeof window !== 'undefined') {
    (window as any)._supabase = _supabase;
  }

  return _supabase;
}

/* ✅ Exports for backward compatibility and imports elsewhere */
export const supabaseClient = getSupabaseClient();
export const supabase = supabaseClient; // <- keeps old imports working

export default supabaseClient;

