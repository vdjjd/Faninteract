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

/* ---------------- COUNTDOWN DISPLAY COMPONENT ---------------- */
function CountdownDisplay({ countdown, isLive }: { countdown: string; isLive: boolean }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!countdown) return;

    const parseCountdown = () => {
      const durationNumber = parseInt(countdown.split(' ')[0]);
      const isMinutes = countdown.includes('Minute');
      const isSeconds = countdown.includes('Second');
      if (isMinutes) return durationNumber * 60;
      if (isSeconds) return durationNumber;
      return 0;
    };

    let totalSeconds = parseCountdown();
    setTimeLeft(totalSeconds);

    if (!isLive) return; // Wait until host clicks Play

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, isLive]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ fontSize: '3rem', fontWeight: 900 }}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}

/* ---------------- MAIN FAN WALL PAGE ---------------- */
export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadEvent() {
    if (!eventId) return;
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (data) setEvent(data);
    setLoading(false);
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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
        position: 'relative',
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

        {/* ---- Logo Container ---- */}
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: '68%',
            transform: 'translate(-50%, -50%)',
            width: '360px',
            height: '160px',
            overflow: 'hidden',
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
              filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.8))',
            }}
          />
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

      {/* ---- Countdown or Starting Soon ---- */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(50% + 80px)',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          color: 'white',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
        }}
      >
        {event.countdown ? (
          <>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>
              Fan Zone Wall Starting In
            </h2>
            <CountdownDisplay countdown={event.countdown} isLive={event.status === 'live'} />
          </>
        ) : (
          <h2
            style={{
              fontSize: '2.8rem',
              fontWeight: 700,
              animation: 'pulse 2s infinite',
            }}
          >
            Fan Zone Wall Starting Soon!!
          </h2>
        )}
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>

      {/* ---- Pulse Animation ---- */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
