// /app/api/resolve-username/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient'; // make sure supabaseAdmin uses SERVICE_ROLE_KEY

interface Body {
  username?: string;
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    // Secure lookup — bypasses RLS using service key
    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('email')
      .eq('username', username)
      .maybeSingle(); // safe if no row found

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch (err) {
    console.error('❌ API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
