// /lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

/* -------------------------------------------------------------------------- */
/* 🔑 READ ENVIRONMENT VARIABLES                                              */
/* -------------------------------------------------------------------------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* -------------------------------------------------------------------------- */
/* 🧱 SAFETY CHECKS                                                          */
/* -------------------------------------------------------------------------- */
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
  });
  throw new Error('Missing Supabase environment configuration.');
}

/* -------------------------------------------------------------------------- */
/* 🌐 PUBLIC CLIENT — used by the browser & client components                */
/* -------------------------------------------------------------------------- */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/* -------------------------------------------------------------------------- */
/* 🛡️ ADMIN CLIENT — used only on the server (API routes, actions)           */
/* -------------------------------------------------------------------------- */
export const supabaseAdmin =
  supabaseServiceKey && supabaseUrl
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;
