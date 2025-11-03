// /lib/supabaseAdminClient.ts
import { createClient } from '@supabase/supabase-js';

/* -------------------------------------------------------------------------- */
/* 🔑 READ ENVIRONMENT VARIABLES                                              */
/* -------------------------------------------------------------------------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* -------------------------------------------------------------------------- */
/* 🧱 SAFETY CHECKS                                                          */
/* -------------------------------------------------------------------------- */
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase admin client configuration:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
  });
}

/* -------------------------------------------------------------------------- */
/* 🛡️ CREATE SERVER-ONLY ADMIN CLIENT                                       */
/* -------------------------------------------------------------------------- */
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;
