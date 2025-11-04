'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState({
    email: '',
    password: '',
    venue_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (signUpError) throw signUpError;

      const userId = data.user?.id;
      if (!userId) throw new Error('No user ID returned.');

      const { error: insertError } = await supabase.from('hosts').insert([
        {
          id: userId,
          email: form.email,
          venue_name: form.venue_name || 'My Venue',
          created_at: new Date().toISOString(),
        },
      ]);
      if (insertError) throw insertError;

      router.push('/login');
    } catch (err: any) {
      console.error('Signup error:', err.message);
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h2 style={titleStyle}>Create Host Account</h2>

        <input
          type="text"
          name="venue_name"
          placeholder="Venue Name"
          onChange={handleChange}
          style={inputStyle}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          style={inputStyle}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          style={inputStyle}
          required
        />

        <button disabled={loading} style={buttonStyle}>
          {loading ? 'Creating...' : 'Sign Up'}
        </button>

        {error && <p style={{ color: 'salmon' }}>{error}</p>}
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
