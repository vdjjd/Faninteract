'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BRAND_LOGO, BRAND_NAME } from '@/lib/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return alert('Please enter your email.');

    // ✅ Send magic link with redirect directly to Host Dashboard
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://faninteract.vercel.app/admin/dashboard',
      },
    });

    if (error) return alert('Error: ' + error.message);
    alert('✅ Check your email for a login link!\n\nOnce you click it, you’ll be redirected to your Host Dashboard.');
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
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>Send Magic Link</button>
      </form>
    </div>
  );
}
