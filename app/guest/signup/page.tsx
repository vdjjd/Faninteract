'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

/* ---------------------- Local Device ID Helper ---------------------- */
function getOrCreateGuestDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem('guest_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('guest_device_id', id);
    }
    return id;
  } catch (err) {
    console.error('❌ Failed to create device ID', err);
    return null;
  }
}

/* ---------------------- Guest Signup Page ---------------------- */
export default function GuestSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const supabase = getSupabaseClient();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getOrCreateGuestDeviceId();
  }, []);

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!agree) throw new Error('You must agree to the Terms.');
      const device_id = localStorage.getItem('guest_device_id');
      if (!device_id) throw new Error('Device ID not found.');
      if (!supabase) throw new Error('Supabase client unavailable.');

      const { data: existing, error: findError } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('device_id', device_id)
        .maybeSingle();

      if (findError) throw findError;

      let profile;
      if (existing) {
        const { data, error } = await supabase
          .from('guest_profiles')
          .update(form)
          .eq('device_id', device_id)
          .select()
          .single();
        if (error) throw error;
        profile = data;
      } else {
        const { data, error } = await supabase
          .from('guest_profiles')
          .insert([{ device_id, ...form }])
          .select()
          .single();
        if (error) throw error;
        profile = data;
      }

      localStorage.setItem('guest_profile', JSON.stringify(profile));
      setSuccess(true);
      setTimeout(() => router.push(redirect || '/thankyou'), 1500);
    } catch (err: any) {
      console.error('Signup error:', err.message);
      setError(err.message || 'Signup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------- UI ---------------------- */
  return (
    <div style={pageStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h2 style={titleStyle}>Join the Fan Zone</h2>

        {['first_name', 'last_name', 'email', 'phone'].map((field) => (
          <input
            key={field}
            name={field}
            type={field === 'email' ? 'email' : 'text'}
            placeholder={
              field === 'first_name'
                ? 'First Name *'
                : field === 'last_name'
                ? 'Last Name *'
                : field === 'email'
                ? 'Email (optional)'
                : 'Phone (optional)'
            }
            value={(form as any)[field]}
            onChange={handleChange}
            required={field === 'first_name' || field === 'last_name'}
            style={inputStyle}
          />
        ))}

        {/* ✅ Terms Agreement */}
        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            style={checkboxStyle}
          />
          I agree to the{' '}
          <a href="/terms" target="_blank" style={termsLink}>
            Terms of Service
          </a>
        </label>

        <button disabled={submitting} style={buttonStyle}>
          {submitting ? 'Submitting...' : 'Join'}
        </button>

        {error && <p style={{ color: 'salmon' }}>{error}</p>}
        {success && <p style={{ color: 'lightgreen' }}>Success! Redirecting...</p>}
      </form>
    </div>
  );
}

/* ---------------------- Styles ---------------------- */
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

const checkboxLabel = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  color: '#ccc',
  fontSize: 13,
  margin: '10px 0 5px 0',
};

const checkboxStyle = {
  accentColor: '#1e90ff',
  width: 18,
  height: 18,
};

const termsLink = {
  color: '#1e90ff',
  textDecoration: 'none',
};
