// /app/api/resolve-username/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client is not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // ✅ Secure lookup — bypasses RLS using service key
    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('email')
      .eq('username', username)
      .single();

    if (error || !data) {
      return NextResponse.json({ found: false, error: error?.message || 'Not found' });
    }

    return NextResponse.json({ found: true, email: data.email });
  } catch (err) {
    console.error('❌ resolve-username error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
