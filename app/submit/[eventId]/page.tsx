'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GuestInfoPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nickname: '',
    age: '',
  });
  const [error, setError] = useState('');

  /* ---------------- LOAD EVENT ---------------- */
  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('title, background_value, logo_url')
        .eq('id', eventId)
        .single();

      if (!error) setEvent(data);
      setLoading(false);

      const animKey = `guestFormAnimated-${eventId}`;
      if (!localStorage.getItem(animKey)) {
        setAnimate(true);
        localStorage.setItem(animKey, 'true');
      }
    }
    fetchEvent();
  }, [eventId]);

  /* ---------------- HANDLE CHANGE ---------------- */
  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  /* ---------------- VALIDATE + CONTINUE ---------------- */
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

  /* ---------------- STYLES ---------------- */
  const inputStyle: React.CSSProperties = {
    width: '90%',
    maxWidth: 320,
    padding: '12px 14px',
    marginBottom: 12,
    borderRadius: 10,
    border: '1px solid #444',
    background: '#0b0b0b',
    color: '#fff',
    fontSize: 15,
    transition: 'all 0.25s ease',
    outline: 'none',
  };

  const containerAnim = animate
    ? {
        animation: 'fadeInUp 1.2s ease forwards',
      }
    : {};

  const logoAnim = animate
    ? {
        animation: 'fadeScale 1s ease forwards',
      }
    : {};

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background:
          event?.background_value || 'linear-gradient(180deg,#0d1b2a,#1b263b)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px',
      }}
    >
      <form
        onSubmit={handleJoin}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(0,0,0,0.75)',
          borderRadius: 14,
          padding: 30,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 25px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          ...containerAnim,
        }}
      >
        {/* LOGO */}
        <img
          src={event?.logo_url || '/faninteractlogo.png'}
          alt="Logo"
          style={{
            width: 140,
            height: 140,
            objectFit: 'contain',
            margin: '0 auto 12px',
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))',
            ...logoAnim,
          }}
        />

        {/* TITLE */}
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 12,
            textShadow: '0 0 12px rgba(0,0,0,0.8)',
          }}
        >
          {event?.title || 'FanInteract Wall'}
        </h2>
        <p style={{ fontSize: 14, color: '#ccc', marginBottom: 20 }}>
          Please complete the fields below to join the wall.
        </p>

        {/* INPUT FIELDS */}
        {['firstName', 'lastName', 'email', 'phone', 'nickname', 'age'].map(
          (field) => (
            <input
              key={field}
              type={
                field === 'email'
                  ? 'email'
                  : field === 'phone'
                  ? 'tel'
                  : field === 'age'
                  ? 'number'
                  : 'text'
              }
              name={field}
              placeholder={
                field === 'firstName'
                  ? 'First Name'
                  : field === 'lastName'
                  ? 'Last Name'
                  : field === 'email'
                  ? 'Email (optional)'
                  : field === 'phone'
                  ? 'Phone (optional)'
                  : field === 'nickname'
                  ? 'Nickname (optional)'
                  : 'Age (optional)'
              }
              value={(form as any)[field]}
              onChange={handleChange}
              style={inputStyle}
              onFocus={(e) =>
                (e.currentTarget.style.boxShadow =
                  '0 0 12px rgba(255,255,255,0.4)')
              }
              onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
            />
          )
        )}

        {error && (
          <p style={{ color: 'salmon', marginBottom: 8, fontSize: 14 }}>
            {error}
          </p>
        )}

        {/* JOIN BUTTON */}
        <button
          type="submit"
          style={{
            width: '90%',
            maxWidth: 320,
            backgroundColor: '#1e90ff',
            border: 'none',
            padding: '12px 0',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 700,
            marginTop: 10,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Join
        </button>

        <p style={{ fontSize: 11, color: '#aaa', marginTop: 16 }}>
          By joining, you accept our{' '}
          <a href="#" style={{ color: '#1e90ff' }}>
            Terms
          </a>{' '}
          &{' '}
          <a href="#" style={{ color: '#1e90ff' }}>
            Privacy Policy
          </a>
          .
        </p>
      </form>

      {/* KEYFRAMES */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
