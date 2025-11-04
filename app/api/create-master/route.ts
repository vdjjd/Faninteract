import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdminClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company_name, first_name, last_name, email } = body;

    if (!company_name || !email) {
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

    // 🔍 Check if this email already exists
    const { data: existing, error: dupError } = await supabaseAdmin
      .from('master_accounts')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (dupError) throw dupError;
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // ✅ Insert new master account
    const { data, error } = await supabaseAdmin
      .from('master_accounts')
      .insert([
        {
          id: crypto.randomUUID(),
          company_name,
          first_name,
          last_name,
          email,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, master: data }, { status: 201 });
  } catch (err: any) {
    console.error('❌ create-master error:', err.message || err);
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    );
  }
}

