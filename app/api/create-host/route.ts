import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, venue_name, email, first_name, last_name, master_id } = body;

    if (!username || !venue_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // check duplicates
    const { data: existing } = await supabaseAdmin
      .from('hosts')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }

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
    console.error('❌ create-host error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
