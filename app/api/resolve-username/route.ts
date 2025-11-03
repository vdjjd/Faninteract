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

    // ✅ Loosen type inference completely to avoid "never" errors
    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('email')
      .eq('username', username)
      .single<any>(); // 👈 Force Supabase to treat it as "any"

    if (error || !data) {
      return NextResponse.json({
        found: false,
        error: error?.message || 'Not found',
      });
    }

    return NextResponse.json({
      found: true,
      email: (data as any).email, // 👈 Cast explicitly
    });
  } catch (err) {
    console.error('❌ resolve-username error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
