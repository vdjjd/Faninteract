import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// POST /api/resolve-username
export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    // Secure lookup — bypasses RLS using service key
    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('email')
      .eq('username', username)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch (err) {
    console.error('❌ API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
