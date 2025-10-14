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
        minHeight: '100vh',
        width: '100%',
        background: '#000', // outer background black
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <form
        onSubmit={handleJoin}
        style={{
          width: '100%',
          maxWidth: 420,
          background: event?.background_value || 'linear-gradient(180deg,#1a2a4a,#0d1b2a)',
          borderRadius: 14,
          padding: 28,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* LOGO */}
        <img
          src={event?.logo_url || '/faninteractlogo.png'}
          alt="Logo"
          style={{
            width: 160,
            height: 160,
            objectFit: 'contain',
            marginBottom: 12,
            borderRadius: 0,
            background: 'transparent',
          }}
        />

        <h2 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>
          {event?.title || 'FanInteract Wall'}
        </h2>
        <p style={{ fontSize: 14, color: '#ccc', marginBottom: 22 }}>
          Please complete the fields below to join the wall.
        </p>

        {/* FIELDS */}
        <div style={{ width: '100%' }}>
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
            padding: '12px 0',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            marginTop: 10,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          Join
        </button>

        <p style={{ fontSize: 11, color: '#bbb', marginTop: 14 }}>
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
