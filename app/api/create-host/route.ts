import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdminClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, venue_name, email, first_name, last_name, master_id } = body;

    if (!username || !venue_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ Create Supabase admin client at runtime
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase admin client unavailable at runtime.');
      return NextResponse.json(
        { error: 'Supabase admin client unavailable.' },
        { status: 503 }
      );
    }

    // 🔍 Check duplicates
    const { data: existing, error: dupError } = await supabaseAdmin
      .from('hosts')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (dupError) throw dupError;
    if (existing) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }

    // ✅ Insert new host
    const { data, error } = await supabaseAdmin
      .from('hosts')
      .insert([
        {
          id: crypto.randomUUID(),
          username,
          venue_name,
          email,
          first_name,
          last_name,
          master_id: master_id || null,
          role: 'host',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, host: data }, { status: 201 });
  } catch (err: any) {
    console.error('❌ create-host error:', err.message || err);
    return NextResponse.json({ error: 'Server error', details: err.message }, { status: 500 });
  }
}
