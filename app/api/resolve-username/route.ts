// Disable type checking entirely
// @ts-nocheck

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * Clean rebuild of username resolver
 * Checks if username exists in hosts table and returns email
 */
export async function POST(req) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('email')
      .eq('username', username)
      .single();

    if (error || !data) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, email: data.email });
  } catch (err) {
    console.error('❌ API error in resolve-username:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}









