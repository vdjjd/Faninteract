// /lib/supabaseAdminClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Supabase admin client could not initialize. Missing variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceKey,
  });
  // Instead of throwing and breaking the build, export null.
  export const supabaseAdmin = null;
} else {
  export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}
