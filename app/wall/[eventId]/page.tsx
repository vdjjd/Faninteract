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

/* ---------- Countdown component ---------- */
function CountdownDisplay({ countdown, isLive }: { countdown: string; isLive: boolean }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!countdown) return;
    const n = parseInt(countdown.split(' ')[0]);
    const mins = countdown.includes('Minute');
    const secs = countdown.includes('Second');
    const total = mins ? n * 60 : secs ? n : 0;
    setTimeLeft(total);
    if (!isLive) return;
    const i = setInterval(() => setTimeLeft(p => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, [countdown, isLive]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <div style={{ fontSize: '3rem', fontWeight: 900 }}>
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* ---------- Main Page ---------- */
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
  useEffect(() => { loadEvent(); }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`events-changes-${eventId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        p => setEvent(prev => (prev ? { ...prev, ...p.new } : p.new as EventData))
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, [eventId]);

  const bg = event?.background_type === 'image'
    ? `url(${event.background_value}) center/cover no-repeat`
    : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  if (loading) return <p className="text-white text-center mt-20">Loading Wall…</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.8s ease',
      }}
    >
      {/* ---------- Anchored Block ---------- */}
      <div
        style={{
          width: '75vw',
          height: '70vh',
          backdropFilter: 'blur(18px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          position: 'relative',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* QR side */}
        <div
          style={{
            flexBasis: '45%',
            margin: 20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 15px rgba(255,255,255,0.1)',
          }}
        >
          {event.qr_url ? (
            <img src={event.qr_url} alt="QR" style={{ width: '75%', height: 'auto', borderRadius: 12 }} />
          ) : (
            <p style={{ opacity: 0.7 }}>QR Placeholder</p>
          )}
        </div>

        {/* Locked layout column */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          {/* Title */}
          <h1
            style={{
              fontSize: 'clamp(2rem,5vw,5rem)',
              fontWeight: 900,
              marginBottom: '1.5rem',
              textShadow: '0 0 20px rgba(0,0,0,0.6)',
            }}
          >
            {event.title || 'Fan Zone Wall'}
          </h1>

          {/* Logo */}
          <div
            style={{
              width: 360,
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <img
              src={event.logo_url || '/faninteractlogo.png'}
              alt="Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.8))',
              }}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              width: '80%',
              height: 10,
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 10px rgba(0,0,0,0.6)',
              marginBottom: '1.5rem',
            }}
          ></div>

          {/* Countdown / message */}
          {event.countdown ? (
            <>
              <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>Fan Zone Wall Starting In</h2>
              <CountdownDisplay countdown={event.countdown} isLive={event.status === 'live'} />
            </>
          ) : (
            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                animation: 'pulse 2s infinite',
              }}
            >
              Fan Zone Wall Starting Soon!!
            </h2>
          )}
        </div>
      </div>

      {/* fullscreen btn */}
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
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.15')}
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen().catch(console.error);
          else document.exitFullscreen();
        }}
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: 26, height: 26 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>

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
