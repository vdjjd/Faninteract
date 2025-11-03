// /app/api/resolve-username/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * Looks up whether a username or email already exists.
 * This version removes TypeScript's "never" errors.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email } = body;

    if (!username && !email) {
      return NextResponse.json({ error: 'Missing username or email' }, { status: 400 });
    }

    // check both master_accounts and hosts
    const { data: hostMatches, error: hostError } = await supabaseAdmin
      .from('hosts')
      .select('email, username')
      .or(`username.eq.${username},email.eq.${email}`);

    if (hostError) throw hostError;

    const { data: masterMatches, error: masterError } = await supabaseAdmin
      .from('master_accounts')
      .select('email')
      .eq('email', email);

    if (masterError) throw masterError;

    const foundRecord =
      (hostMatches && hostMatches.length > 0) ||
      (masterMatches && masterMatches.length > 0);

    return NextResponse.json({
      found: foundRecord,
      email: email || null,
      username: username || null,
    });
  } catch (err: any) {
    console.error('❌ resolve-username error:', err.message);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
