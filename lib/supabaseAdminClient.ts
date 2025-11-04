import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('⚠️ Missing Supabase admin environment variables at runtime');
  }

  return createClient(url!, serviceKey!, { auth: { persistSession: false } });
}