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

  // --- Initial Load + Resync ---
  async function loadEvent() {
    if (!eventId) return;
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (data) setEvent(data);
    setLoading(false);
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  // --- Realtime Updates with Auto-Reconnect + Resync ---
  useEffect(() => {
    if (!eventId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const subscribeToChannel = () => {
      channel = supabase
        .channel(`events-changes-${eventId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
          (payload) => {
            const updated = payload.new as Partial<EventData>;
            setEvent((prev) => (prev ? { ...prev, ...updated } : (updated as EventData)));
          }
        )
        .subscribe();
    };

    subscribeToChannel();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (channel) supabase.removeChannel(channel);
        subscribeToChannel();
        loadEvent();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel) supabase.removeChannel(channel);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [eventId]);

  const getBackground = (bg?: string, type?: string | null) => {
    if (!bg) return 'linear-gradient(to bottom right, #1b2735, #090a0f)';
    if (type === 'image') return `url(${bg}) center/cover no-repeat`;
    return bg;
  };

  if (loading) return <p className="text-white text-center mt-20">Loading Wall …</p>;
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        transition: 'background 0.8s ease',
      }}
    >
      {/* ---- Public Title ---- */}
      <h1
        style={{
          color: 'white',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
          fontWeight: 900,
          letterSpacing: '1px',
          width: '80%',
          maxWidth: '1600px',
          marginTop: '4vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2rem, 5vw, 5rem)',
          lineHeight: '1.1',
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* ---- MSV (Main Visual Container) ---- */}
      <div
        style={{
          width: '75vw',
          height: '70vh',
          backdropFilter: 'blur(18px)',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          boxShadow: '10px 10px 30px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          color: 'white',
          textAlign: 'center',
          fontSize: '1.8rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ---- QR Code Container ---- */}
        <div
          style={{
            flexBasis: '45%',
            height: 'calc(100% - 40px)',
            marginLeft: '20px',
            marginTop: '20px',
            marginBottom: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 15px rgba(255,255,255,0.1)',
            position: 'relative',
          }}
        >
          {event.qr_url ? (
            <img
              src={event.qr_url}
              alt="QR Code"
              style={{ width: '75%', height: 'auto', borderRadius: '12px' }}
            />
          ) : (
            <p style={{ fontSize: '1rem', opacity: 0.7 }}>QR Placeholder</p>
          )}
        </div>

        {/* ---- Right Section Wrapper ---- */}
        <div
          style={{
            position: 'absolute',
            left: '45%',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* ---- Logo Container (now centered above grey bar) ---- */}
          <div
            style={{
              marginTop: '40px',
              width: '220px',
              height: '100px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1)',
              overflow: 'hidden',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={event.logo_url || '/faninteractlogo.png'}
              alt="Event or Venue Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.6))',
              }}
            />
          </div>
        </div>

        {/* ---- Horizontal Divider Line ---- */}
        <div
          style={{
            position: 'absolute',
            left: 'calc(45% + 40px)',
            right: '20px',
            height: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            borderRadius: '6px',
            background: 'linear-gradient(to right, #000, #444)',
            boxShadow: '0 0 10px rgba(0,0,0,0.6)',
            opacity: 0.8,
          }}
        ></div>
      </div>

      {/* ---- Fullscreen Toggle ---- */}
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"
          />
        </svg>
      </div>
    </div>
  );
}
