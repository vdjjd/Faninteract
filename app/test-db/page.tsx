'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestDB() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    async function checkConnection() {
      const { data, error } = await supabase.from('events').select('*').limit(1);
      if (error) setStatus('❌ Supabase connection failed: ' + error.message);
      else setStatus('✅ Connected to Supabase! Found table: events');
    }
    checkConnection();
  }, []);

  return (
    <div style={{ fontSize: 24, padding: 40 }}>
      <h2>Database Connection Test</h2>
      <p>{status}</p>
    </div>
  );
}
