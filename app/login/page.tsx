'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BRAND_LOGO, BRAND_NAME } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalMessage(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setModalMessage(null);

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
      setModalMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Styles ---------- */

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a2540, #1b2b44, #000000)',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    position: 'relative',
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '300px',
    zIndex: 5,
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

  const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  };

  const modalBox: React.CSSProperties = {
    background: 'linear-gradient(145deg, #111b2f, #0c1320)',
    border: '1px solid #1e90ff',
    padding: '30px 40px',
    borderRadius: 16,
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(30,144,255,0.3)',
    maxWidth: 400,
    color: 'white',
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
      </form>

      <p style={{ marginTop: 10 }}>
        Don’t have an account?{' '}
        <a href="/signup" style={{ color: '#1e90ff' }}>
          Sign up
        </a>
      </p>

      {/* 🔵 Modal Popup */}
      {modalMessage && (
        <div
          style={modalOverlay}
          onClick={() => setModalMessage(null)}
        >
          <div style={modalBox}>
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Login Error</h2>
            <p style={{ marginBottom: 20 }}>{modalMessage}</p>
            <button
              onClick={() => setModalMessage(null)}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(90deg, #1e90ff, #0077ff)',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
