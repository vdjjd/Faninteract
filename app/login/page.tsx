'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resolveRes = await fetch('/api/resolve-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.usernameOrEmail.includes('@')
            ? null
            : form.usernameOrEmail,
          email: form.usernameOrEmail.includes('@')
            ? form.usernameOrEmail
            : null,
        }),
      });

      const resolveData = await resolveRes.json();

      if (!resolveRes.ok || !resolveData.found) {
        throw new Error('No matching account found.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolveData.email,
        password: form.password,
      });
      if (signInError) throw signInError;

      if (resolveData.type === 'master') {
        router.push('/admin/master-dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err.message);
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Login</h1>

      <form onSubmit={handleLogin} style={formStyle}>
        <input
          type="text"
          name="usernameOrEmail"
          placeholder="Username or Email"
          value={form.usernameOrEmail}
          onChange={handleChange}
          style={inputStyle}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={inputStyle}
          required
        />

        <button disabled={loading} style={buttonStyle}>
          {loading ? 'Signing In…' : 'Login'}
        </button>

        {error && <p style={errorStyle}>{error}</p>}
      </form>
    </div>
  );
}

/* ---------- Styles (matching signup page) ---------- */
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
  color: 'white',
};

const titleStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: '20px',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '320px',
};

const inputStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #333',
  backgroundColor: '#1a1a1a',
  color: 'white',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#1e90ff',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  color: 'salmon',
  textAlign: 'center',
  marginTop: '8px',
};
