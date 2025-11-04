// /lib/supabaseAdminClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * During Vercel builds, process.env may not be injected yet.
 * Don't throw; just warn, so build completes.
 */
if (!supabaseUrl || !serviceRoleKey) {
  console.warn('⚠️ Supabase admin env vars not detected during build.');
  console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.warn('SUPABASE_SERVICE_ROLE_KEY exists:', !!serviceRoleKey);
}

/**
 * Create the admin client (empty strings are safe fallbacks;
 * they'll be replaced with real values at runtime)
 */
export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
  auth: { persistSession: false },
});

export default supabaseAdmin;
