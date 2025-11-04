import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('⚠️ Supabase admin env vars not detected during build.');
  console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.warn('SUPABASE_SERVICE_ROLE_KEY exists:', !!serviceRoleKey);

  // ⛔️ Instead of crashing build, create a fake stub client
  // that just logs if used during build
  supabaseAdmin = {
    from: () => ({
      select: () => {
        console.warn('⚠️ Stub Supabase client used during build phase.');
        return { data: null, error: null };
      },
    }),
  } as unknown as SupabaseClient;
} else {
  // ✅ Real client at runtime
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export { supabaseAdmin };
export default supabaseAdmin;
