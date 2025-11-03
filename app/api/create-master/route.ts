import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company_name, first_name, last_name, email } = body;

    if (!company_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('master_accounts')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

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
    console.error('❌ create-master error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
