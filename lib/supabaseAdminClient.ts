'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://abwfofjwwcggkfgqtzsk.supabase.co';
const secretKey = sb_secret_2tD1Tk2KxVPE-N_P_gWSPQ_KXdmjKYl;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    '❌ Missing Supabase admin environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are defined in Vercel → Project Settings → Environment Variables.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false },
});
