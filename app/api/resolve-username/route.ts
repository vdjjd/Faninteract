// @ts-nocheck
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

/**
 * ✅ API route: /api/resolve-username
 * Checks whether a username exists in the hosts table
 * Returns { found: boolean, email?: string }
 */

export async function POST(req) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    // Query the "hosts" table for this username
    const { data, error } = await supabaseAdmin
      .from('hosts')
      .select('id, username, email')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ found: false });
    }

    // ✅ If found, return the associated email
    return NextResponse.json({
      found: true,
      email: data.email,
    });
  } catch (err) {
    console.error('❌ resolve-username error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}








