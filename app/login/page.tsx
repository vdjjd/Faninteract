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
      // 🔍 Step 1: Resolve username/email and find account type
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

      // 🔐 Step 2: Authenticate with Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolveData.email,
        password: form.password,
      });
      if (signInError) throw signInError;

      // 🚀 Step 3: Redirect based on account type
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
      <form onSubmit={handleLogin} style={formStyle}>
        <h2 style={titleStyle}>Login</h2>

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
          {loading ? 'Signing In...' : 'Login'}
        </button>

        {error && (
          <p style={{ color: 'salmon', marginTop: '10px', textAlign: 'center' }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

/* ---------- Styles ---------- */
const pageStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
  color: 'white',
};

const formStyle = {
  background: 'rgba(0,0,0,0.7)',
  padding: '40px 30px',
  borderRadius: 12,
  width: 340,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const titleStyle = {
  fontWeight: 700,
  fontSize: '1.4rem',
  textAlign: 'center' as const,
  marginBottom: 10,
};

const inputStyle = {
  padding: '10px',
  borderRadius: 8,
  border: '1px solid #333',
  background: 'rgba(255,255,255,0.1)',
  color: 'white',
};

const buttonStyle = {
  padding: '10px',
  borderRadius: 8,
  backgroundColor: '#1e90ff',
  border: 'none',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};
