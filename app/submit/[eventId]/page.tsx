'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GuestSignupPage() {
  const { eventId } = useParams();
  const eventUUID = Array.isArray(eventId) ? eventId[0] : eventId;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  /* ---------- Device ID ---------- */
  function getDeviceId() {
    let existing = localStorage.getItem('deviceId');
    if (!existing) {
      existing = crypto.randomUUID();
      localStorage.setItem('deviceId', existing);
    }
    return existing;
  }

  /* ---------- Submit ---------- */
  async function handleSubmit(e: any) {
    e.preventDefault();

    if (!firstName.trim()) {
      alert('Please enter your first name.');
      return;
    }

    // Require either email or phone
    if (!email.trim() && !phone.trim()) {
      alert('Please provide either an email or a phone number.');
      return;
    }

    setSubmitting(true);
    setFadeOut(true);

    const deviceId = getDeviceId();

    // Upsert guest profile
    const { data: profileData, error: profileError } = await supabase
      .from('guest_profiles')
      .upsert(
        {
          device_id: deviceId,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        },
        { onConflict: 'device_id' }
      )
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating guest profile:', profileError);
      alert('Error saving profile.');
      setSubmitting(false);
      setFadeOut(false);
      return;
    }

    // Insert guest record linked to this event
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .insert([
        {
          event_id: eventUUID,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          guest_profile_id: profileData.id,
        },
      ])
      .select()
      .single();

    if (guestError) {
      console.error('❌ Error creating guest entry:', guestError);
      alert('Error submitting guest info.');
      setSubmitting(false);
      setFadeOut(false);
      return;
    }

    // ✅ Save guest profile locally for auto-fill
    localStorage.setItem(
      'guestProfile',
      JSON.stringify({
        id: profileData.id,
        device_id: profileData.device_id,
        first_name: profileData.first_name,
        guest_id: guestData.id,
      })
    );

    // Redirect to post submission page
    setTimeout(() => {
      window.location.href = `/submit/${eventUUID}/post`;
    }, 800);
  }

  return (
    <div
      style={{
        background: '#000',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(180deg,#0d1b2a,#1b263b)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h2 style={{ marginBottom: 14, fontWeight: 700 }}>
          Join the Fan Zone Wall
        </h2>

        <input
          type="text"
          placeholder="First Name *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={inputStyle}
          required
        />

        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={inputStyle}
        />

        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />

        <p style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>
          * You must enter either your email or phone number.
        </p>

        <button
          type="submit"
          disabled={submitting}
          style={{
            backgroundColor: '#1e90ff',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            padding: '12px 0',
            width: '90%',
            fontSize: 16,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s ease',
          }}
        >
          {submitting ? 'Submitting…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '90%',
  margin: '0 auto 12px',
  display: 'block',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #666',
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: 15,
  textAlign: 'center',
  opacity: 0.9,
};
