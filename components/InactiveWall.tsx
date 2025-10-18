'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import CountdownDisplay from './CountdownDisplay';

interface EventData {
  id: string;
  title: string | null;
  countdown: string | null;
  countdown_active?: boolean;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
}

export default function InactiveWall({ event }: { event: EventData }) {
  const [bg, setBg] = useState('');

  useEffect(() => {
    const background =
      event?.background_type === 'image'
        ? `url(${event.background_value}) center/cover no-repeat`
        : event?.background_value ||
          'linear-gradient(to bottom right,#1b2735,#090a0f)';
    setBg(background);
  }, [event]);

  return (
    <>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { text-shadow: 0 0 18px rgba(255,255,255,0.3), 0 0 36px rgba(255,255,255,0.2); opacity: 0.95; }
          50% { text-shadow: 0 0 28px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.5); opacity: 1; }
        }
        .pulse { animation: pulseGlow 2.5s ease-in-out infinite; }
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

        {/* ---------- MAIN DISPLAY ---------- */}
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
          }}
        >
          {/* ---------- COUNTDOWN OR IDLE MESSAGE ---------- */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
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
                }}
              >
                Fan Zone Wall
                <br />
                Starting Soon!!
              </h2>
            )}
          </div>

          {/* ---------- LARGE QR (BOTTOM LEFT) ---------- */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              width: 260,
              height: 260,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 0 15px rgba(0,0,0,0.6)',
            }}
          >
            <QRCodeCanvas
              value={`https://faninteract.vercel.app/submit/${event.id}`}
              size={230}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              style={{
                borderRadius: 10,
                width: '90%',
                height: 'auto',
              }}
            />
          </div>

          {/* ---------- GRAY BAR ---------- */}
          <div
            style={{
              position: 'absolute',
              left: '45%',
              right: '10%',
              height: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 10px rgba(0,0,0,0.6)',
              opacity: 0.8,
            }}
          ></div>

          {/* ---------- LOGO ---------- */}
          <div
            style={{
              position: 'absolute',
              top: '25%',
              right: '10%',
              transform: 'translateY(-50%)',
              width: 'clamp(180px, 20vw, 320px)',
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
        </div>
      </div>
    </>
  );
}
