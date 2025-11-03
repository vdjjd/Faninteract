// /app/api/resolve-username/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * ✅ Safe, JS-only version (no TypeScript build errors)
 */
export async function POST(req) {
  try {
    const { username, email } = await req.json();

    if (!username && !email) {
      return NextResponse.json({ error: 'Missing username or email' }, { status: 400 });
    }

    // check both tables
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
  } catch (err) {
    console.error('❌ resolve-username error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
