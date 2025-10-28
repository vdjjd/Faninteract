import { createClient } from '@supabase/supabase-js';

// ✅ Pull from environment (must exist in .env.local or Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ Public client — safe for client-side use
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ✅ Server-only admin client (never bundled to browser)
export const supabaseAdmin =
  typeof window === 'undefined' && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
