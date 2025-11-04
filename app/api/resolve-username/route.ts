// /app/api/resolve-username/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function POST(req: Request) {
  try {
    const { username, email } = await req.json();

    if (!username && !email) {
      return NextResponse.json({ error: 'Missing username or email' }, { status: 400 });
    }

    // ✅ Look up in hosts
    const { data: hostMatch, error: hostError } = await supabaseAdmin
      .from('hosts')
      .select('email, username')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (hostError) throw hostError;

    if (hostMatch) {
      return NextResponse.json({
        found: true,
        email: hostMatch.email,
        username: hostMatch.username,
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
  } catch (err: any) {
    console.error('❌ resolve-username error:', err.message || err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}