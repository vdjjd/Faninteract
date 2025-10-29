'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ThankYouPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    async function fetchEvent() {
      const { data } = await supabase
        .from('events')
        .select('type, background_value, logo_url')
        .eq('id', eventId)
        .single();
      setEvent(data);
    }

    fetchEvent();

    // ⏳ Fade out after 3s, close at 4s
    const fadeTimer = setTimeout(() => setFadeOut(true), 3000);
    const closeTimer = setTimeout(() => window.close(), 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [eventId]);

  const bg =
    event?.background_value ||
    'linear-gradient(180deg,#0d1b2a,#1b263b)';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        textAlign: 'center',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1s ease-in-out',
      }}
    >
      <img
        src={event?.logo_url || '/faninteractlogo.png'}
        alt="FanInteract"
        style={{
          width: 160,
          height: 160,
          objectFit: 'contain',
          marginBottom: 20,
          filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))',
        }}
      />

      <h1 style={{ fontSize: '2rem', marginBottom: 10 }}>
        🎉 Thank You for Submitting!
      </h1>

      {event?.type === 'fan_wall' && (
        <p style={{ fontSize: '1rem', color: '#ccc', marginBottom: 30 }}>
          Your post has been sent for approval.
        </p>
      )}

      <button
        onClick={() => window.close()}
        style={{
          background: '#1e90ff',
          border: 'none',
          borderRadius: 10,
          color: '#fff',
          fontWeight: 600,
          padding: '12px 20px',
          fontSize: 16,
          cursor: 'pointer',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.8s ease-in-out',
        }}
      >
        Close Now
      </button>
    </div>
  );
}