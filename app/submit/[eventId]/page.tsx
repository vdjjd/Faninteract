'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GuestInfoPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const eventUUID = Array.isArray(eventId) ? eventId[0] : eventId;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
  });
  const [error, setError] = useState('');

  /* ---------------- VERIFY EXISTING GUEST ---------------- */
  useEffect(() => {
    async function verifyGuest() {
      const stored = localStorage.getItem('guestInfo');
      if (!stored) return;

      try {
        const guest = JSON.parse(stored);
        if (!guest.firstName || !guest.lastName) return;

        // ✅ Check if this guest exists for this event
        const { data, error } = await supabase
          .from('guests')
          .select('id')
          .eq('event_id', eventUUID)
          .eq('first_name', guest.firstName)
          .eq('last_name', guest.lastName)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          console.log('✅ Verified returning guest:', guest.firstName);
          router.replace(`/submit/${eventUUID}/post`);
        } else {
          console.log('🧹 Clearing stale guest info.');
          localStorage.removeItem('guestInfo');
        }
      } catch (err) {
        console.error('Error verifying guest:', err);
        localStorage.removeItem('guestInfo');
      }
    }
    verifyGuest();
  }, [eventUUID, router]);

  /* ---------------- LOAD EVENT ---------------- */
  useEffect(() => {
    if (!eventUUID) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('title, background_value, logo_url')
        .eq('id', eventUUID)
        .single();

      if (error) console.error('Error loading event:', error);
      if (data) setEvent(data);
      setLoading(false);
    };

    fetchEvent();

    const ch = supabase
      .channel(`events-${eventUUID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventUUID}`,
        },
        (payload) =>
          setEvent((prev: any) =>
            prev ? { ...prev, ...payload.new } : payload.new
          )
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventUUID]);

  /* ---------------- FORM HANDLERS ---------------- */
  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleJoin = async (e: any) => {
    e.preventDefault();
    setError('');

    const { firstName, lastName, email, phone, age } = form;

    if (!firstName || !lastName) {
      setError('Please enter both your first and last name.');
      return;
    }
    if (!email && !phone) {
      setError('Please provide either an email or phone number.');
      return;
    }
    if (!agree) {
      setError('You must agree to the Terms of Service to continue.');
      return;
    }

    setSubmitting(true);

    /* ---------- Create or find guest_profile ---------- */
    let guestProfileId: string | null = null;

    if (email || phone) {
      const { data: existing, error: findError } = await supabase
        .from('guest_profiles')
        .select('id')
        .or(`email.eq.${email},phone.eq.${phone}`)
        .maybeSingle();

      if (findError) console.error('Find guest_profile error:', findError);

      if (existing) {
        guestProfileId = existing.id;
      } else {
        const { data: newProfile, error: insertError } = await supabase
          .from('guest_profiles')
          .insert([
            {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email?.trim() || null,
              phone: phone?.trim() || null,
            },
          ])
          .select()
          .single();

        if (insertError) console.error('Insert guest_profile error:', insertError);
        guestProfileId = newProfile?.id || null;
      }
    }

    /* ---------- Insert guest record for this event ---------- */
    const { error: guestInsertError } = await supabase
      .from('guests')
      .insert([
        {
          event_id: eventUUID,
          guest_profile_id: guestProfileId, // 🔗 link to universal profile
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          age: age ? parseInt(age) : null,
        },
      ])
      .select();

    if (guestInsertError) {
      console.error('❌ Insert guest error:', guestInsertError);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    // ✅ Save guest info locally (for next scans)
    localStorage.setItem(
      'guestInfo',
      JSON.stringify({ ...form, guest_profile_id: guestProfileId, event_id: eventUUID })
    );

    // ✅ Redirect to submission page
    router.push(`/submit/${eventUUID}/post`);
  };

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
        }}
      >
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

        <h2
          style={{
            fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
            marginTop: -12,
            marginBottom: 10,
            fontWeight: 700,
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