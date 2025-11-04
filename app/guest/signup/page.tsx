'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient'; // ✅ runtime getter

/* ----------------------------- DEVICE HANDLER ---------------------------- */
function getOrCreateGuestDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem('guest_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('guest_device_id', id);
      console.log('🆕 Created device_id:', id);
    }
    return id;
  } catch (err) {
    console.error('❌ Failed to create device ID', err);
    return null;
  }
}

/* --------------------------- GUEST SIGNUP PAGE --------------------------- */
function GuestSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const supabase = getSupabaseClient(); // ✅ runtime client only

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getOrCreateGuestDeviceId();
  }, []);

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    const { first_name, last_name, email, phone } = form;
    if (!first_name || !last_name)
      return setError('Please enter both first and last name.');
    if (!email && !phone)
      return setError('Provide at least an email or phone.');
    if (!agree) return setError('You must agree to the Terms.');

    const device_id = localStorage.getItem('guest_device_id');
    if (!device_id) return setError('No device ID. Refresh and try again.');
    if (!supabase) return setError('Supabase client unavailable.');

    setSubmitting(true);

    try {
      const { data: existing, error: findError } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('device_id', device_id)
        .maybeSingle();
      if (findError) throw findError;

      let profile = existing;
      if (!profile) {
        const { data, error } = await supabase
          .from('guest_profiles')
          .insert([{ device_id, first_name, last_name, email, phone }])
          .select()
          .single();
        if (error) throw error;
        profile = data;
      } else {
        const { data, error } = await supabase
          .from('guest_profiles')
          .update({ first_name, last_name, email, phone })
          .eq('device_id', device_id)
          .select()
          .single();
        if (error) throw error;
        profile = data;
      }

      localStorage.setItem(
        'guestInfo',
        JSON.stringify({
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          guest_profile_id: profile.id,
        })
      );

      console.log('✅ Guest profile saved:', profile);
      router.push(redirect || '/thankyou');
    } catch (err: any) {
      console.error('❌ Signup error:', err.message || err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------- UI LAYOUT ------------------------------ */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0d1b2a,#1b263b)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        fontFamily: 'system-ui,sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(0,0,0,0.75)',
          borderRadius: 16,
          padding: 30,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ marginBottom: 16, fontWeight: 700 }}>Join the Fan Zone</h2>

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
            style={{
              width: '85%',
              padding: '12px',
              marginBottom: 12,
              borderRadius: 10,
              border: '1px solid #777',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 16,
              textAlign: 'center',
            }}
          />
        ))}

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#ccc',
            fontSize: 13,
            margin: '10px 0 20px 0',
          }}
        >
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            style={{ accentColor: '#1e90ff', width: 18, height: 18 }}
          />
          I agree to the&nbsp;
          <a href="/terms" target="_blank" style={{ color: '#1e90ff' }}>
            Terms of Service
          </a>
        </label>

        {error && <p style={{ color: 'salmon', marginBottom: 8 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '85%',
            backgroundColor: submitting ? '#444' : '#1e90ff',
            border: 'none',
            padding: '12px 0',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  );
}

/* ---------------------- SUSPENSE WRAPPER (REQUIRED) ---------------------- */
export default function SignupPageWrapper() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg,#0d1b2a,#1b263b)',
            color: '#fff',
            fontFamily: 'system-ui,sans-serif',
            fontSize: '1.2rem',
          }}
        >
          Loading...
        </div>
      }
    >
      <GuestSignupPage />
    </Suspense>
  );
}

/* ✅ Prevent prerender (runtime-only Supabase) */
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = false;