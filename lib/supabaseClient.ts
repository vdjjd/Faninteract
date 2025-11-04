'use client';

import { createClient } from '@supabase/supabase-js';

// ⚠️ TEMPORARY HARD-CODE FOR TROUBLESHOOTING ONLY
const supabaseUrl = 'https://abwfofjwwcggkfgqtzsk.supabase.co';
const supabaseKey = 'sb_publishable_FDOSXDfAEX0dU65qOht0oQ_T3DHuBVp'; // your publishable key

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set in Vercel → Project Settings → Environment Variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

