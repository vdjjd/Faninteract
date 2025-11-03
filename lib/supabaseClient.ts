// /lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 🔒 Defensive check — prevents Vercel build crash
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required Supabase environment variables:', {
    url: !!supabaseUrl,
    anon: !!supabaseAnonKey,
    service: !!supabaseServiceKey,
  });
  throw new Error('Missing Supabase environment configuration');
}

// ✅ Public client (for frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ✅ Admin client (for server-only calls)
export const supabaseAdmin =
  supabaseServiceKey && supabaseUrl
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
