import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    // 🧱 Validate query param
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    // 🔐 Ensure the admin client is initialized
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not initialized.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // ✅ Explicit type for safe inference
    type HostRecord = { email: string };

    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('email')
      .eq('username', username)
      .single<HostRecord>();

    // ❗Handle missing or failed query
    if (error || !data) {
      console.warn('⚠️ No host found or Supabase query failed:', error?.message);
      return NextResponse.json({
        found: false,
        error: error?.message || 'Host not found',
      });
    }

    // ✅ Success
    return NextResponse.json({
      found: true,
      email: data.email,
    });
  } catch (err) {
    console.error('❌ resolve-username route error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}



