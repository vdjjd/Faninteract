'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // username OR email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let emailToUse = identifier;

      // Resolve username to email if no "@"
      if (!identifier.includes('@')) {
        const res = await fetch('/api/resolve-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Invalid username.');
        emailToUse = result.email;
      }

      // Sign in with Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      if (signInError) throw signInError;

      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Host Login</h1>

      <form onSubmit={handleLogin} style={formStyle}>
        <input
          type="text"
          placeholder="Username or Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Signing In...' : 'Login'}
        </button>

        {error && <p style={errorStyle}>{error}</p>}
      </form>

      <p style={signupTextStyle}>
        Don’t have an account?{' '}
        <a href="/signup" style={signupLinkStyle}>
          Sign up
        </a>
      </p>
    </div>
  );
}

/* ---------- Styles ---------- */
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
  color: 'white',
  padding: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '20px',
  color: '#a0c4ff',
  textAlign: 'center',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '320px',
  backgroundColor: 'rgba(13,22,37,0.9)',
  padding: '30px',
  borderRadius: '12px',
  border: '1px solid #1e90ff',
  boxShadow: '0 0 20px rgba(30,144,255,0.3)',
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
  background: 'linear-gradient(to right, #1e90ff, #3a8dff)',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(30,144,255,0.3)',
  transition: 'all 0.2s ease-in-out',
};

const errorStyle: React.CSSProperties = {
  color: 'red',
  marginTop: '8px',
  fontSize: '0.9rem',
  textAlign: 'center',
};

const signupTextStyle: React.CSSProperties = {
  marginTop: '15px',
  color: '#ccc',
  textAlign: 'center',
  fontSize: '0.9rem',
};

const signupLinkStyle: React.CSSProperties = {
  color: '#1e90ff',
  textDecoration: 'underline',
  cursor: 'pointer',
};
