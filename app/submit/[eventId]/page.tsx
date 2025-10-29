'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { syncGuestProfile } from '@/lib/syncGuest';

export default function GuestSignupPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const eventUUID = Array.isArray(eventId) ? eventId[0] : eventId;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    age: '',
  });
  const [error, setError] = useState('');

  /* ---------- Load Event Info ---------- */
  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('title, background_value, logo_url')
        .eq('id', eventUUID)
        .single();

      if (error) console.error('Error loading event:', error);
      if (data) setEvent(data);
      setLoading(false);
    }
    fetchEvent();
  }, [eventUUID]);

  /* ---------- Handle Input Changes ---------- */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ---------- Handle Submit ---------- */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    const { first_name, last_name, email, phone, age } = form;

    if (!first_name || !last_name) {
      setError('Please enter both your first and last name.');
      return;
    }

    if (!email && !phone) {
      setError('Please provide either an email or a phone number.');
      return;
    }

    if (!agree) {
      setError('You must agree to the Terms of Service to continue.');
      return;
    }

    setSubmitting(true);

    try {
      // 🔹 Use the new universal sync helper
      const { profile } = await syncGuestProfile(
        event?.host_id || '', // optional if host_id column exists
        eventUUID,
        {
          first_name,
          last_name,
          email,
          phone,
        }
      );

      // ✅ Store a simple local profile (for wall auto-fill)
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

      console.log('✅ Guest registered:', profile.first_name);
      router.push(`/submit/${eventUUID}/post`);
    } catch (err) {
      console.error('❌ Guest signup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return <p style={{ textAlign: 'center', color: '#fff' }}>Loading...</p>;

  /* ---------- UI ---------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
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
          background:
            event?.background_value ||
            'linear-gradient(180deg,#0d1b2a,#1b263b)',
          borderRadius: 16,
          padding: 30,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0,0,0,0.6)',
        }}
      >
        <img
          src={event?.logo_url || '/faninteractlogo.png'}
          alt="Logo"
          style={{
            width: 220,
            height: 220,
            objectFit: 'contain',
            marginBottom: -10,
            marginTop: -20,
            filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))',
          }}
        />

        <h2
          style={{
            fontSize: 'clamp(1.4rem, 2.5vw, 2.1rem)',
            marginTop: -10,
            marginBottom: 12,
            fontWeight: 700,
          }}
        >
          {event?.title || 'Join the Fan Zone Wall'}
        </h2>

        {[
          { name: 'first_name', placeholder: 'First Name *' },
          { name: 'last_name', placeholder: 'Last Name *' },
          { name: 'email', placeholder: 'Email (optional)' },
          { name: 'phone', placeholder: 'Phone (optional)' },
          { name: 'age', placeholder: 'Age (optional)', type: 'number' },
        ].map((field) => (
          <input
            key={field.name}
            type={field.type || 'text'}
            name={field.name}
            placeholder={field.placeholder}
            value={(form as any)[field.name]}
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
              outline: 'none',
              transition: 'all 0.3s ease',
            }}
          />
        ))}

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
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
          I agree to the{' '}
          <a href="/terms" target="_blank" style={{ color: '#1e90ff' }}>
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" style={{ color: '#1e90ff' }}>
            Privacy Policy
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