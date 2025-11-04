// /app/api/resolve-username/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * POST /api/resolve-username
 * Body: { username?: string, email?: string }
 * Resolves a host or master account email by username/email.
 */
export async function POST(req: Request) {
  try {
    const { username, email } = await req.json();

    if (!username && !email) {
      return NextResponse.json(
        { error: 'Missing username or email' },
        { status: 400 }
      );
    }

    // ✅ Create Supabase admin client at runtime (ensures live env vars)
    const supabaseAdmin = getSupabaseAdmin();

    // ---------- Search "hosts" table ----------
    const { data: hostMatch, error: hostError } = await supabaseAdmin
      .from('hosts')
      .select('email, username')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (hostError) throw hostError;

    if (hostMatch) {
      return NextResponse.json({
        found: true,
        email: hostMatch.email,
        username: hostMatch.username,
      });
    }

    // ---------- Search "master_accounts" table ----------
    const { data: masterMatch, error: masterError } = await supabaseAdmin
      .from('master_accounts')
      .select('contact_email')
      .eq('contact_email', email)
      .maybeSingle();

    if (masterError) throw masterError;

    if (masterMatch) {
      return NextResponse.json({
        found: true,
        email: masterMatch.contact_email,
        username: null,
      });
    }

    // ---------- Nothing found ----------
    return NextResponse.json(
      { found: false, error: 'User not found' },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('❌ resolve-username error:', err.message || err);
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    );
  }
}
