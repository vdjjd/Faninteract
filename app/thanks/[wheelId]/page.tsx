'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/* ------------------------------------------------------------- */
/* 🎉 Universal Thank You Page for Prize Wheel or Fan Wall        */
/* ------------------------------------------------------------- */
export default function ThankYouPage() {
  const { wheelId } = useParams();
  const router = useRouter();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Auto-fade + redirect back after a few seconds (optional)
    const timer1 = setTimeout(() => setFadeOut(true), 2500);
    const timer2 = setTimeout(() => {
      router.push('/');
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [router]);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#0d47a1,#1976d2)',
        color: '#fff',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1s ease-in-out',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '20px 40px',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 16,
          boxShadow: '0 0 25px rgba(0,0,0,0.4)',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          🎉 You’re In!
        </h1>
        <p style={{ fontSize: 16, color: '#ddd' }}>
          Thanks for entering the drawing.
          <br />
          Watch the screen — you might be the next winner!
        </p>
      </div>
    </div>
  );
}
