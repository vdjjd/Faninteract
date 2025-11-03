// /app/api/resolve-username/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// 🧠 Match your real Supabase table structure
interface HostRow {
  id: string;
  username: string;
  venue_name: string;
  email: string;
  role: string;
  master_id: string | null;
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  auth_id: string | null;
  logo_url: string | null;
  branding_logo_url: string | null;
}

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

    // ✅ Fully typed Supabase query
    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select<HostRow>('id, username, venue_name, email, role')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase error:', error.message);
      return NextResponse.json({ found: false, error: error.message });
    }

    if (!data) {
      return NextResponse.json({ found: false, error: 'Not found' });
    }

    // ✅ Safe, typed result
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






