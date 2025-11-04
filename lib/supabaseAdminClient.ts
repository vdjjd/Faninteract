'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    '❌ Missing Supabase admin environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are defined in Vercel → Project Settings → Environment Variables.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false },
});
