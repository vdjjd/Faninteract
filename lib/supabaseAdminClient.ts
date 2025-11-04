import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('🚨 Missing Supabase environment variables!');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', url);
    console.error('SUPABASE_SERVICE_ROLE_KEY exists:', !!serviceKey);
    throw new Error('Missing Supabase environment variables!');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
