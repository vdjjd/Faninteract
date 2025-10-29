'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧠 SAFE DEVICE ID HANDLER                                                  */
/* -------------------------------------------------------------------------- */
function getOrCreateGuestDeviceId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    let device_id = localStorage.getItem('guest_device_id');
    if (!device_id) {
      device_id = crypto.randomUUID();
      localStorage.setItem('guest_device_id', device_id);
      console.log('🆕 Created new device_id:', device_id);
    } else {
      console.log('♻️ Using existing device_id:', device_id);
    }
    return device_id;
  } catch (err) {
    console.error('❌ Failed to get device_id:', err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 🎯 Guest Signup Page — Writes ONLY to guest_profiles                       */
/* -------------------------------------------------------------------------- */
export default function GuestSignupPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const eventUUID = Array.isArray(eventId) ? eventId[0] : eventId;

  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    age: '',
  });

  /* ---------------------------------------------------------------------- */
  /* 🔹 Ensure device_id exists                                             */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window !== 'undefined') getOrCreateGuestDeviceId();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🔹 Handle input changes                                                */
  /* ---------------------------------------------------------------------- */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ---------------------------------------------------------------------- */
  /* 🔹 Submit form                                                        */
  /* ---------------------------------------------------------------------- */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    const { first_name, last_name, email, phone } = form;

    if (!first_name || !last_name) {
      setError('Please enter both first and last name.');
      return;
    }
    if (!email && !phone) {
      setError('Please provide either an email or phone number.');
      return;
    }
    if (!agree) {
      setError('You must agree to the Terms of Service.');
      return;
    }

    const device_id = localStorage.getItem('guest_device_id');
    if (!device_id) {
      setError('No device ID found. Please refresh and try again.');
      return;
    }

    setSubmitting(true);

    try {
      // 🔍 Check existing guest_profile
      const { data: existingProfile, error: findError } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('device_id', device_id)
        .maybeSingle();

      if (findError) throw findError;

      let profile = existingProfile;

      if (!profile) {
        // 🧾 Create new
        const { data: inserted, error: insertError } = await supabase
          .from('guest_profiles')
          .insert([
            {
              device_id,
              first_name,
              last_name,
              email,
              phone,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        profile = inserted;
        console.log('✅ Created new guest_profile:', profile);
      } else {
        // 🔁 Update existing
        const { data: updated, error: updateError } = await supabase
          .from('guest_profiles')
          .update({
            first_name,
            last_name,
            email,
            phone,
          })
          .eq('device_id', device_id)
          .select()
          .single();

        if (updateError) throw updateError;
        profile = updated;
        console.log('♻️ Updated guest_profile:', profile);
      }

      // 💾 Cache locally
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

      console.log('🎯 guest_profiles write successful');
      router.push(`/submit/${eventUUID}/post`);
    } catch (err: any) {
      console.error('❌ guest_profile write failed:', err.message || err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 🔹 Render — No event branding                                         */
  /* ---------------------------------------------------------------------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0d1b2a,#1b263b)', // static background
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
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
        <h2 style={{ marginBottom: 16, fontWeight: 700 }}>
          Join the Fan Zone
        </h2>

        {['first_name', 'last_name', 'email', 'phone', 'age'].map((field) => (
          <input
            key={field}
            name={field}
            type={field === 'age' ? 'number' : 'text'}
            placeholder={
              field === 'first_name'
                ? 'First Name *'
                : field === 'last_name'
                ? 'Last Name *'
                : field === 'email'
                ? 'Email (optional)'
                : field === 'phone'
                ? 'Phone (optional)'
                : 'Age (optional)'
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
