// /lib/supabaseAdminClient.ts
import { createClient } from '@supabase/supabase-js';

// ✅ Read from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Supabase admin client could not initialize. Missing variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceKey,
  });
} else {
  supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export { supabaseAdmin };
