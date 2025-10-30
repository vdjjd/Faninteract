'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ThankYouPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [fadeOut, setFadeOut] = useState(false);

  const type = searchParams.get('type') || 'fan_wall'; // default

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      const table =
        type === 'poll'
          ? 'polls'
          : type === 'wheel'
          ? 'prize_wheels'
          : type === 'fan_wall'
          ? 'fan_walls'
          : 'events';

      const { data, error } = await supabase
        .from(table)
        .select('title, background_value, logo_url')
        .eq('id', id)
        .maybeSingle();

      if (error) console.error(error);
      setData(data);
    }

    fetchData();

    const fadeTimer = setTimeout(() => setFadeOut(true), 3500);
    const closeTimer = setTimeout(() => {
      try {
        window.close();
      } catch {
        console.log('Close blocked; staying open.');
      }
    }, 4500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [id, type]);

  const bg =
    data?.background_value ||
    'linear-gradient(180deg,#0d1b2a,#1b263b)';

  /* ---------- Dynamic Messages ---------- */
  const getMessage = () => {
    switch (type) {
      case 'poll':
        return 'Your vote has been recorded!';
      case 'wheel':
        return 'Good luck! Your spin has been logged.';
      case 'trivia':
        return 'Your answer has been submitted!';
      default:
        return 'Your post has been sent for approval.';
    }
  };

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
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1.2s ease-in-out',
      }}
    >
      <img
        src={data?.logo_url || '/faninteractlogo.png'}
        alt="FanInteract"
        style={{
          width: 160,
          height: 160,
          objectFit: 'contain',
          marginBottom: 20,
          filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))',
        }}
      />

      <h1 style={{ fontSize: '2.2rem', marginBottom: 10 }}>
        🎉 Thank You for Participating!
      </h1>

      <p style={{ fontSize: '1rem', color: '#ccc', marginBottom: 30 }}>
        {getMessage()}
      </p>

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
        Close
      </button>
    </div>
  );
}
