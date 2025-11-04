import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * POST /api/create-host
 * Creates a new Host account linked to Supabase Auth.
 * Body: { username, venue_name, email, first_name?, last_name?, master_id?, auth_id? }
 */
export async function POST(req: Request) {
  try {
    const {
      username,
      venue_name,
      email,
      first_name,
      last_name,
      master_id,
      auth_id,
    } = await req.json();

    // 🧱 Validate required fields
    if (!username || !venue_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields (username, venue_name, or email).' },
        { status: 400 }
      );
    }

    // 🧩 Create Supabase admin client
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase admin client unavailable at runtime.');
      return NextResponse.json(
        { error: 'Supabase admin client unavailable.' },
        { status: 503 }
      );
    }

    // 🔍 Check for duplicates by username OR email
    const { data: existing, error: dupError } = await supabaseAdmin
      .from('hosts')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (dupError) throw dupError;
    if (existing) {
      return NextResponse.json(
        { error: 'Username or email already exists.' },
        { status: 409 }
      );
    }

    // ✅ Insert new Host row
    const { data, error: insertError } = await supabaseAdmin
      .from('hosts')
      .insert([
        {
          id: crypto.randomUUID(),
          username,
          venue_name,
          email,
          role: 'host',
          master_id: master_id || null,
          first_name: first_name || null,
          last_name: last_name || null,
          auth_id: auth_id || null, // FK to auth.users if you’re linking Auth
          created_at: new Date().toISOString(),
          logo_url: null,
          branding_logo_url: null,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ New host created:', data.id);
    return NextResponse.json({ success: true, host: data }, { status: 201 });
  } catch (err: any) {
    console.error('❌ /api/create-host error:', err.message || err);
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    );
  }
}
