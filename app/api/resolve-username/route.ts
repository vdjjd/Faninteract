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
      console.error('❌ Supabase admin client not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 🧠 Run the query (no strict typing here)
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

    // ✅ Explicitly tell TS “trust me, this is a HostRow”
    const host = data as {
      email: string;
      username: string;
      venue_name: string;
    };

    return NextResponse.json({
      found: true,
      email: host.email,
      username: host.username,
      venue_name: host.venue_name,
    });
  } catch (err) {
    console.error('❌ resolve-username error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}







