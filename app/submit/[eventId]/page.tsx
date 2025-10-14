'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GuestInfoPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const eventUUID = Array.isArray(eventId) ? eventId[0] : eventId; // ✅ clean UUID
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nickname: '',
    age: '',
  });
  const [error, setError] = useState('');

  /* ---------------- LOAD + SUBSCRIBE TO EVENT ---------------- */
  useEffect(() => {
    if (!eventUUID) return;

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

    const ch = supabase
      .channel(`events-${eventUUID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventUUID}` },
        (payload) => {
          const updated = payload.new;
          setEvent((prev: any) => (prev ? { ...prev, ...updated } : updated));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventUUID]);

  /* ---------------- FORM HANDLERS ---------------- */
  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleJoin(e: any) {
    e.preventDefault();
    setError('');
    const { firstName, lastName, email, phone, nickname, age } = form;

    // Simple validation
    if (!firstName || !lastName) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!email && !phone) {
      setError('Please enter either an email or phone.');
      return;
    }

    setSubmitting(true);

    // Animate form fade out
    const formEl = document.getElementById('guest-form');
    formEl?.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-40px)' },
      ],
      { duration: 600, easing: 'ease-in-out', fill: 'forwards' }
    );

    await new Promise((res) => setTimeout(res, 600));

    /* ---------------- INSERT INTO GUESTS TABLE ---------------- */
    const { data, error: insertError } = await supabase
      .from('guests')
      .insert([
        {
          event_id: eventUUID,
          first_name: firstName?.trim(),
          last_name: lastName?.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          nickname: nickname?.trim() || null,
          age: age ? parseInt(age) : null,
        },
      ])
      .select();

    console.log('🧠 Supabase insert result:', { data, insertError });

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      alert(`Insert failed: ${insertError.message}`);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    } else {
      console.log('✅ Guest added successfully:', data);
      alert('Guest added successfully!');
    }

    // Save locally for continuity
    localStorage.setItem('guestInfo', JSON.stringify(form));

    // ✅ Redirect to the “post submission” page
    router.push(`/submit/${eventUUID}/post`);
  }

  if (loading)
    return <p style={{ textAlign: 'center', color: '#fff' }}>Loading...</p>;

  /* ---------------- RENDER ---------------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <form
        id="guest-form"
        onSubmit={handleJoin}
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ---------- LOGO ---------- */}
        <img
          src={event?.logo_url || '/faninteractlogo.png'}
          alt="Logo"
          style={{
            width: 300,
            height: 300,
            objectFit: 'contain',
            marginBottom: -6,
            marginTop: -20,
            filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))',
          }}
        />

        {/* ---------- WALL TITLE ---------- */}
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
            marginTop: -12,
            marginBottom: 10,
            fontWeight: 700,
            textShadow: '0 0 12px rgba(0,0,0,0.6)',
          }}
        >
          {event?.title || 'FanInteract Wall'}
        </h2>

        <p style={{ fontSize: 14, color: '#ddd', marginBottom: 20 }}>
          Please complete the fields below to join the wall.
        </p>

        {[
          { name: 'firstName', placeholder: 'First Name' },
          { name: 'lastName', placeholder: 'Last Name' },
          { name: 'email', placeholder: 'Email (optional)' },
          { name: 'phone', placeholder: 'Phone (optional)' },
          { name: 'nickname', placeholder: 'Nickname (optional)' },
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
            onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 10px #fff')}
            onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
          />
        ))}

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
            marginTop: 10,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s ease',
          }}
        >
          {submitting ? 'Joining...' : 'Join'}
        </button>

        <p style={{ fontSize: 11, color: '#bbb', marginTop: 14 }}>
          By joining, you accept our{' '}
          <a href="#" style={{ color: '#1e90ff' }}>Terms</a> &{' '}
          <a href="#" style={{ color: '#1e90ff' }}>Privacy Policy</a>.
        </p>
      </form>
    </div>
  );
}
