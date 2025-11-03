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

    // ✅ Explicitly type the query result so TypeScript knows it includes "email"
    const { data, error } = await supabaseAdmin
      .from<{ email: string }>('hosts')
      .select('email')
      .eq('us

