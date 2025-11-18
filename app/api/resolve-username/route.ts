import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * POST /api/resolve-username
 * Body: { username?: string, email?: string }
 * Resolves whether the provided username/email belongs
 * to a Host or a Master account, and returns type + email.
 */
export async function POST(req: Request) {
  try {
    const { username, email } = await req.json();

    // 🧱 Validate request
    if (!username && !email) {
      return NextResponse.json(
        { error: 'Missing username or email.' },
        { status: 400 }
      );
    }

    // 🧩 Create Supabase admin client
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase admin client unavailable at runtime.');
      return NextResponse.json(
        { error: 'Supabase admin client unavailable.' },
        { status: 503 }
      );
    }

    // ---------- 1️⃣ Search "hosts" table ----------
    const { data: hostMatch, error: hostError } = await supabaseAdmin
      .from('hosts')
      .select('email, username, role')
      .or(`username.eq.${username || ''},email.eq.${email || ''}`)
      .maybeSingle();

    if (hostError) throw hostError;

    if (hostMatch) {
      return NextResponse.json({
        found: true,
        type: 'host',
        email: hostMatch.email,
        username: hostMatch.username,
      });
    }

    // ---------- 2️⃣ Search "master_accounts" table ----------
    const { data: masterMatch, error: masterError } = await supabaseAdmin
      .from('master_accounts')
      .select('contact_email, contact_name, role')
      .eq('contact_email', email || '')
      .maybeSingle();

    if (masterError) throw masterError;

    if (masterMatch) {
      return NextResponse.json({
        found: true,
        type: 'master',
        email: masterMatch.contact_email,
        username: masterMatch.contact_name,
      });
    }

    // ---------- 3️⃣ Nothing found ----------
    return NextResponse.json(
      { found: false, error: 'User not found.' },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('❌ /api/resolve-username error:', err.message || err);
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    );
  }
}
