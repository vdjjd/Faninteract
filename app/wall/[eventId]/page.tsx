'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface EventData {
  id: string;
  title: string | null;
  status: 'inactive' | 'live';
  countdown: string | null;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
  qr_url: string | null;
  host_id: string;
}

export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------- FETCH EVENT ----------------
  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;
      const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (data) setEvent(data);
      setLoading(false);
    }
    loadEvent();
  }, [eventId]);

  // ---------------- BACKGROUND HELPER ----------------
  const getBackground = (bg?: string, type?: string | null) => {
    if (!bg) return 'linear-gradient(to bottom right, #1b2735, #090a0f)';
    if (type === 'image') return `url(${bg}) center/cover no-repeat`;
    return bg;
  };

  // ---------------- RENDER ----------------
  if (loading) return <p className="text-white text-center mt-20">Loading Wall...</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  return (
    <div
      style={{
        background: getBackground(event.background_value ?? '', event.background_type),
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ---- Card Area Box ---- */}
      <div
        style={{
          width: '75vw',
          height: '75vh',
          backdropFilter: 'blur(18px)',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          boxShadow: '10px 10px 30px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          fontSize: '1.8rem',
        }}
      >
        <p style={{ opacity: 0.8 }}>Fan Zone Wall - Inactive Mode</p>
      </div>

      {/* ---- Fullscreen Toggle Button ---- */}
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          width: 48,
          height: 48,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'opacity 0.3s ease',
          opacity: 0.15,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.15')}
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
          } else {
            document.exitFullscreen();
          }
        }}
        title="Toggle Fullscreen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="white"
          style={{ width: 26, height: 26 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>
    </div>
  );
}
