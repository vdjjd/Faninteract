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

    // ✅ Declare data type explicitly
    type HostRecord = { email: string } | null;

    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('email')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase error:', error.message);
      return NextResponse.json({ found: false, error: error.message });
    }

    const record = data as HostRecord;

    if (!record) {
      return NextResponse.json({ found: false, error: 'Not found' });
    }

    // ✅ Explicitly typed now
    return NextResponse.json({ found: true, email: record.email });
  } catch (err) {
    console.error('❌ resolve-username error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}





