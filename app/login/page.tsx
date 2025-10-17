'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BRAND_LOGO, BRAND_NAME } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Step 1️⃣ — find host email by username
      const { data: host, error: hostError } = await supabase
        .from('hosts')
        .select('email, id')
        .eq('username', username)
        .maybeSingle();

      if (hostError || !host) throw new Error('Invalid username.');

      // Step 2️⃣ — try logging in with the host’s email + password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: host.email,
        password,
      });

      if (signInError) throw new Error('Invalid password.');

      // Step 3️⃣ — redirect to dashboard
      router.push(`/admin/dashboard?host_id=${host.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0d0d0d, #1a1a1a)',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '300px',
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px',
    borderRadius: 6,
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px',
    borderRadius: 6,
    border: 'none',
    background: '#1e90ff',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={pageStyle}>
      <img
        src={BRAND_LOGO}
        alt={`${BRAND_NAME} logo`}
        style={{ width: 160, marginBottom: 20 }}
      />
      <h1 style={{ marginBottom: 10 }}>{BRAND_NAME} Host Login</h1>
      <form onSubmit={handleLogin} style={formStyle}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />
        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      </form>
      <p style={{ marginTop: 10 }}>
        Don’t have an account? <a href="/signup" style={{ color: '#1e90ff' }}>Sign up</a>
      </p>
    </div>
  );
}
