'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GuestInfoPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nickname: '',
    age: '',
  });
  const [error, setError] = useState('');

  /* ---------------- FETCH EVENT DATA ---------------- */
  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('title, background_value, logo_url')
        .eq('id', eventId)
        .single();

      if (!error) setEvent(data);
      setLoading(false);
    }
    fetchEvent();
  }, [eventId]);

  /* ---------------- FORM HANDLERS ---------------- */
  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleJoin(e: any) {
    e.preventDefault();
    setError('');

    const { firstName, lastName, email, phone } = form;
    if (!firstName || !lastName) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!email && !phone) {
      setError('Please enter either an email or a phone number.');
      return;
    }

    localStorage.setItem('guestInfo', JSON.stringify(form));
    router.push(`/submit/${eventId}/post`);
  }

  if (loading)
    return <p style={{ textAlign: 'center', color: '#fff' }}>Loading...</p>;

  /* ---------------- RENDER ---------------- */
  return (
    <div
      style={{
        height: '100dvh', // dynamic full viewport height
        width: '100vw',
        background: '#000', // outer background black
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        padding: 0,
        margin: 0,
      }}
    >
      <div
        style={{
          width: '92%',
          maxWidth: 460,
          height: 'min(92dvh, 700px)', // fits within most screens but shrinks gracefully
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background:
            event?.background_value ||
            'linear-gradient(180deg,#1a2a4a,#0d1b2a)',
          borderRadius: 18,
          padding: 'clamp(16px, 3vh, 28px)',
          boxShadow: '0 0 35px rgba(0,0,0,0.8)',
          textAlign: 'center',
          overflowY: 'auto',
        }}
      >
        <form
          onSubmit={handleJoin}
          style={{
            width: '100%',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(8px, 1vh, 14px)',
          }}
        >
          {/* LOGO */}
          <img
            src={event?.logo_url || '/faninteractlogo.png'}
            alt="Logo"
            style={{
              width: 'clamp(180px, 30vw, 240px)',
              height: 'auto',
              objectFit: 'contain',
              marginBottom: 'clamp(10px, 2vh, 18px)',
              background: 'transparent',
            }}
          />

          <h2
            style={{
              fontSize: 'clamp(20px, 2.6vw, 26px)',
              marginBottom: 6,
              fontWeight: 700,
              textShadow: '0 0 8px rgba(0,0,0,0.6)',
            }}
          >
            {event?.title || 'FanInteract Wall'}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#ddd',
              marginBottom: 'clamp(12px, 2vh, 22px)',
              maxWidth: 340,
            }}
          >
            Please complete the fields below to join the wall.
          </p>

          {/* FIELDS */}
          <div style={{ width: '100%', textAlign: 'center' }}>
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="email"
              name="email"
              placeholder="Email (optional if phone given)"
              value={form.email}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone (optional if email given)"
              value={form.phone}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="text"
              name="nickname"
              placeholder="Nickname (optional)"
              value={form.nickname}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="number"
              name="age"
              placeholder="Age (optional)"
              value={form.age}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {error && <p style={{ color: 'salmon', marginBottom: 8 }}>{error}</p>}

          <button
            type="submit"
            style={{
              width: '100%',
              backgroundColor: '#1e90ff',
              border: 'none',
              padding: '14px 0',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 17,
              boxShadow: '0 0 15px rgba(30,144,255,0.4)',
            }}
          >
            Join
          </button>

          <p style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>
            By joining, you accept our{' '}
            <a href="#" style={{ color: '#1e90ff' }}>
              Terms
            </a>{' '}
            &{' '}
            <a href="#" style={{ color: '#1e90ff' }}>
              Privacy Policy
            </a>.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  marginBottom: 10,
  borderRadius: 6,
  border: '1px solid #444',
  background: '#000',
  color: '#fff',
  fontSize: 15,
  textAlign: 'center',
  outline: 'none',
};
