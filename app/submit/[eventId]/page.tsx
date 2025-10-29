'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/**
 * ⚙️ This page ONLY writes to guest_profiles.
 * No guest table logic exists anywhere in this file.
 */

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
        .select('id, title, background_value')
        .eq('id', eventUUID)
        .single();

      if (error) console.error('Error loading event:', error);
      if (data) setEvent(data);
      setLoading(false);
    }
    if (eventUUID) fetchEvent();
  }, [eventUUID]);

  /* ---------- Get or Create Device ID ---------- */
  const getDeviceId = () => {
    if (typeof window === 'undefined') return 'server';
    let device_id = localStorage.getItem('guest_device_id');
    if (!device_id) {
      device_id = crypto.randomUUID();
      localStorage.setItem('guest_device_id', device_id);
      console.log('🆕 Created new device_id:', device_id);
    } else {
      console.log('♻️ Existing device_id:', device_id);
    }
    return device_id;
  };

  /* ---------- Handle Form Change ---------- */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ---------- Submit ---------- */
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

    setSubmitting(true);

    try {
      const device_id = getDeviceId();

      // 🔹 Insert or update guest_profiles ONLY
      const { data: existingProfile } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('device_id', device_id)
        .maybeSingle();

      let profile = existingProfile;

      if (!profile) {
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
        console.log('♻️ Updated existing guest_profile:', profile);
      }

      // ✅ Save to local storage
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

      console.log('🎯 guest_profiles written successfully');

      // ✅ Redirect to photo/message post page
      router.push(`/submit/${eventUUID}/post`);
    } catch (err: any) {
      console.error('❌ Insert guest_profile failed:', err.message || err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Loading ---------- */
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
            event?.background_value || 'linear-gradient(180deg,#0d1b2a,#1b263b)',
          borderRadius: 16,
          padding: 30,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ marginBottom: 16, fontWeight: 700 }}>
          {event?.title || 'Join the Fan Zone Wall'}
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
