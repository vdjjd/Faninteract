import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// disable type checking just for this file
// @ts-nocheck

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('id, username, venue_name, email, role')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase error:', error.message);
      return NextResponse.json({ found: false, error: error.message });
    }

    if (!data) {
      return NextResponse.json({ found: false, error: 'Not found' });
    }

    // data is untyped, but we know it has these fields
    return NextResponse.json({
      found: true,
      email: data.email,
      username: data.username,
      venue_name: data.venue_name,
    });
  } catch (err) {
    console.error('❌ resolve-username error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}







