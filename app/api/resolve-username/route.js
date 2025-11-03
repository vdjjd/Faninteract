// /app/api/resolve-username/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function POST(req) {
  try {
    const { username, email } = await req.json();

    if (!username && !email) {
      return NextResponse.json({ error: 'Missing username or email' }, { status: 400 });
    }

    // ✅ Look up in hosts
    const { data: hostMatches, error: hostError } = await supabaseAdmin
      .from('hosts')
      .select('email, username')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (hostError) throw hostError;

    // ✅ If found in hosts, return it
    if (hostMatches) {
      return NextResponse.json({
        found: true,
        email: hostMatches.email,
        username: hostMatches.username,
      });
    }

    // ✅ Otherwise, look in master_accounts by email
    const { data: masterMatch, error: masterError } = await supabaseAdmin
      .from('master_accounts')
      .select('contact_email')
      .eq('contact_email', email)
      .limit(1)
      .maybeSingle();

    if (masterError) throw masterError;

    if (masterMatch) {
      return NextResponse.json({
        found: true,
        email: masterMatch.contact_email,
        username: null,
      });
    }

    // ❌ Nothing found
    return NextResponse.json({ found: false, error: 'User not found' }, { status: 404 });
  } catch (err) {
    console.error('❌ resolve-username error:', err.message || err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
