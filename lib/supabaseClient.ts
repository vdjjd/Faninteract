// /lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Vercel sometimes doesn’t inject env vars during build analysis.
 * Don’t throw—just warn so the build can finish.
 */
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase public env vars not detected at build time.');
  console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
}

/**
 * Create the client with safe fallbacks.
 * Empty strings are harmless and will be replaced at runtime.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
