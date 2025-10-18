'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

/* ---------- COUNTDOWN ---------- */
function CountdownDisplay({
  countdown,
  isActive,
  eventId,
}: {
  countdown: string;
  isActive: boolean;
  eventId: string;
}) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!countdown) return;
    const n = parseInt(countdown.split(' ')[0]);
    const mins = countdown.includes('Minute');
    const secs = countdown.includes('Second');
    const total = mins ? n * 60 : secs ? n : 0;
    setTimeLeft(total);
  }, [countdown]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          supabase.from('events').update({ status: 'live' }).eq('id', eventId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, eventId, timeLeft]);

  if (timeLeft <= 0) return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <div
      style={{
        fontSize: '4vw',
        fontWeight: 900,
        lineHeight: 1,
        textShadow: '0 0 12px rgba(0,0,0,0.6)',
      }}
    >
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* ---------- INACTIVE WALL ---------- */
export default function InactiveWall({ event }: { event: any }) {
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

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

        {/* ---------- DISPLAY AREA ---------- */}
        <div
          style={{
            width: '80vw',
            height: '70vh',
            backdropFilter: 'blur(18px)',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 20,
            boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* ---------- BIG QR (LEFT SIDE) ---------- */}
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
                size={360} // ⬅️ Bigger now
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={false}
                style={{
                  borderRadius: 12,
                  width: '90%',
                  height: 'auto',
                  boxShadow: '0 0 10px rgba(0,0,0,0.4)',
                }}
              />
            ) : (
              <p style={{ opacity: 0.7 }}>Generating QR...</p>
            )}
          </div>

          {/* ---------- RIGHT SIDE CONTENT ---------- */}
          <div
            style={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* ---------- LOGO ---------- */}
            <div
              style={{
                width: 'clamp(180px, 20vw, 320px)',
                marginBottom: '2vh',
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
                width: '80%',
                height: 10,
                borderRadius: 6,
                background: 'linear-gradient(to right,#000,#444)',
                boxShadow: '0 0 10px rgba(0,0,0,0.6)',
                opacity: 0.8,
                marginBottom: '3vh',
              }}
            ></div>

            {/* ---------- TEXT / COUNTDOWN ---------- */}
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
                <CountdownDisplay
                  countdown={event.countdown}
                  isActive={!!event.countdown_active}
                  eventId={event.id}
                />
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
                  textAlign: 'center',
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
            opacity: 0.2,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.2')}
          onClick={() => {
            if (!document.fullscreenElement)
              document.documentElement.requestFullscreen().catch(console.error);
            else document.exitFullscreen();
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
    </>
  );
}
