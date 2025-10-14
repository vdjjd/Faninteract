'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { QRCodeCanvas } from "qrcode.react";

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

function CountdownDisplay({ countdown, isLive }: { countdown: string; isLive: boolean }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!countdown) return;
    const n = parseInt(countdown.split(' ')[0]);
    const mins = countdown.includes('Minute');
    const secs = countdown.includes('Second');
    const total = mins ? n * 60 : secs ? n : 0;
    setTimeLeft(total);
    if (!isLive) return;
    const t = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown, isLive]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <div style={{ fontSize: '4vw', fontWeight: 900, lineHeight: 1 }}>
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;
      const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (data) setEvent(data);
      setLoading(false);
    }
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
  .channel('public:events')
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
      supabase.removeChannel(ch);
    };
  }, [eventId]);

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  if (loading) return <p className="text-white text-center mt-20">Loading Wall …</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  return (
    <>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% {
            text-shadow: 0 0 18px rgba(255,255,255,0.3), 0 0 36px rgba(255,255,255,0.2);
            opacity: 0.95;
          }
          50% {
            text-shadow: 0 0 28px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.5);
            opacity: 1;
          }
        }
        .pulse {
          animation: pulseGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      <div
        style={{
          background: bg,
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          transition: 'background 0.8s ease',
        }}
      >
        {/* ---------- TITLE ---------- */}
        <h1
          style={{
            color: '#fff',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(0,0,0,0.6)',
            fontWeight: 900,
            letterSpacing: '1px',
            marginTop: '4vh',
            marginBottom: '2vh',
            fontSize: 'clamp(2.2rem, 4vw, 5rem)',
            lineHeight: 1.1,
          }}
        >
          {event.title || 'Fan Zone Wall'}
        </h1>

        {/* ---------- MAIN BOX ---------- */}
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
            alignItems: 'center',
            justifyContent: 'flex-start',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* ---------- QR ---------- */}
          <div
            style={{
              flexBasis: '45%',
              height: 'calc(100% - 40px)',
              margin: '20px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 15px rgba(255,255,255,0.1)',
            }}
          >
{event ? (
  <QRCodeCanvas
    value={`https://faninteract.vercel.app/submit/${event.id}`}
    size={260}
    bgColor="#ffffff"
    fgColor="#000000"
    level="H"
    includeMargin={false}
    style={{
      borderRadius: 12,
      width: '75%',
      height: 'auto',
      boxShadow: '0 0 10px rgba(0,0,0,0.4)',
    }}
  />
) : (
  <p style={{ opacity: 0.7 }}>Generating QR...</p>
)}
          </div>

          {/* ---------- LOGO ---------- */}
          <div
            style={{
              position: 'absolute',
              top: '25%',
              left: '72%',
              transform: 'translate(-50%, -50%)',
              width: 'clamp(180px, 20vw, 320px)',
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={event.logo_url || '/faninteractlogo.png'}
              alt="Logo"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.85))',
              }}
            />
          </div>

          {/* ---------- GREY BAR ---------- */}
          <div
            style={{
              position: 'absolute',
              left: 'calc(45% + 40px)',
              right: '20px',
              height: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 10px rgba(0,0,0,0.6)',
              opacity: 0.8,
            }}
          ></div>

          {/* ---------- MESSAGE (Lowered Position + Pulse) ---------- */}
          <div
            style={{
              position: 'absolute',
              top: '68%', // 👈 lowered from 60% to 68%
              left: '72%',
              transform: 'translate(-50%, -50%)',
              width: '46%',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            {event.countdown ? (
              <>
                <h2
                  style={{
                    fontWeight: 600,
                    textShadow: '0 0 10px rgba(0,0,0,0.6)',
                    fontSize: 'clamp(1.8rem, 2.4vw, 3rem)',
                    marginBottom: 10,
                  }}
                >
                  Fan Zone Wall Starting In
                </h2>
                <CountdownDisplay countdown={event.countdown} isLive={event.status === 'live'} />
              </>
            ) : (
              <h2
                className="pulse"
                style={{
                  fontWeight: 850,
                  textShadow: '0 0 20px rgba(0,0,0,0.8)',
                  margin: 0,
                  fontSize: 'clamp(2.2rem, 3.2vw, 4.2rem)',
                  lineHeight: 1.2,
                  whiteSpace: 'normal',
                }}
              >
                Fan Zone Wall
                <br />
                Starting Soon!!
              </h2>
            )}
          </div>
        </div>

        {/* ---------- FULLSCREEN BUTTON ---------- */}
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
      </div>
    </>
  );
}
