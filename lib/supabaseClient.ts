import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase public env vars not detected at build time.');
  console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);

  // ⛔️ Stub client to prevent SDK crash during build
  supabase = {
    from: () => ({
      select: () => {
        console.warn('⚠️ Stub Supabase client used during build phase.');
        return { data: null, error: null };
      },
      insert: () => {
        console.warn('⚠️ Stub Supabase insert called during build.');
        return { data: null, error: null };
      },
      update: () => {
        console.warn('⚠️ Stub Supabase update called during build.');
        return { data: null, error: null };
      },
    }),
    auth: {
      signInWithOtp: async () => {
        console.warn('⚠️ Stub auth.signInWithOtp used during build.');
        return { data: null, error: null };
      },
      signOut: async () => {
        console.warn('⚠️ Stub auth.signOut used during build.');
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
} else {
  // ✅ Real client at runtime
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export { supabase };
export default supabase;
