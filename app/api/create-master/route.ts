import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * POST /api/create-master
 * Creates a new master account linked to Supabase Auth.
 * Body: { company_name, contact_name, contact_email, auth_id }
 */
export async function POST(req: Request) {
  try {
    const { company_name, contact_name, contact_email, auth_id } = await req.json();

    // 🧱 Validate required fields
    if (!company_name || !contact_name || !contact_email || !auth_id) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: company_name, contact_name, contact_email, or auth_id.',
        },
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

    // 🔍 Check for duplicates (unique contact_email)
    const { data: existing, error: dupError } = await supabaseAdmin
      .from('master_accounts')
      .select('id')
      .eq('contact_email', contact_email)
      .maybeSingle();

    if (dupError) throw dupError;
    if (existing) {
      return NextResponse.json(
        { error: 'A master account with this email already exists.' },
        { status: 409 }
      );
    }

    // ✅ Insert new master account
    const { data, error: insertError } = await supabaseAdmin
      .from('master_accounts')
      .insert([
        {
          id: auth_id, // Matches Supabase Auth user ID (FK)
          company_name,
          contact_name,
          contact_email,
          role: 'master',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ New master account created:', data.id);
    return NextResponse.json({ success: true, master: data }, { status: 201 });
  } catch (err: any) {
    console.error('❌ /api/create-master error:', err.message || err);
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    );
  }
}
