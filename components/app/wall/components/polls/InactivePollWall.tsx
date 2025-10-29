'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

/* ---------- COUNTDOWN DISPLAY ---------- */
function CountdownDisplay({
  countdown,
  countdownActive,
  pollId,
}: {
  countdown: string;
  countdownActive: boolean;
  pollId: string;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [originalTime, setOriginalTime] = useState<number>(0);

  // Convert countdown string ("5 Minutes", "30 Seconds") → seconds
  useEffect(() => {
    if (!countdown) return;
    const num = parseInt(countdown.split(' ')[0]);
    const mins = countdown.toLowerCase().includes('minute');
    const secs = countdown.toLowerCase().includes('second');
    const total = mins ? num * 60 : secs ? num : 0;
    setTimeLeft(total);
    setOriginalTime(total);
  }, [countdown]);

  // When Play clicked → countdown_active = true → start timer
  useEffect(() => {
    if (!countdownActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 🟢 When timer hits zero, set poll live
          (async () => {
            const { error } = await supabase
              .from('polls')
              .update({ status: 'live', countdown_active: false })
              .eq('id', pollId);
            if (error) {
              console.error('❌ Error setting poll live:', error);
            } else {
              console.log('✅ Countdown finished — poll set live');
            }
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive, pollId, timeLeft]);

  // Reset timer if countdown_active set to false (Stop clicked)
  useEffect(() => {
    if (!countdownActive) setTimeLeft(originalTime);
  }, [countdownActive, originalTime]);

  if (!countdown) return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <div
      style={{
        fontSize: '4vw',
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 0 15px rgba(0,0,0,0.6)',
        marginTop: '1vh',
      }}
    >
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* ---------- INACTIVE POLL WALL ---------- */
export default function InactivePollWall({ poll }: { poll: any }) {
  const bg =
    poll?.background_type === 'image'
      ? `url(${poll.background_value}) center/cover no-repeat`
      : poll?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  // Optional debug log (you can delete later)
  // useEffect(() => {
  //   console.log('🧾 QR for this poll:', poll.qr_url);
  // }, [poll.qr_url]);

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
            marginTop: '3vh',
            marginBottom: '1.5vh',
            fontSize: 'clamp(2.5rem, 4vw, 5rem)',
            lineHeight: 1.1,
          }}
        >
          {poll.title || 'Fan Polling Zone'}
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
          <QRCodeCanvas
            value={poll.qr_url || `https://faninteract.vercel.app/poll/${poll.id}`}
            size={420}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
            style={{
              borderRadius: 16,
              marginLeft: '4vw',
              width: '45%',
              height: 'auto',
              boxShadow: '0 0 20px rgba(0,0,0,0.6)',
            }}
          />

          {/* ---------- RIGHT SIDE ---------- */}
          <div
            style={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
              transform: 'translateY(-11%)',
            }}
          >
            {/* ---------- LOGO ---------- */}
            <div
              style={{
                width: 'clamp(260px, 26vw, 380px)',
                marginBottom: '0.8vh',
                transform: 'translateY(-3vh)',
              }}
            >
              <img
                src={poll.logo_url || '/faninteractlogo.png'}
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
                width: '92%',
                height: 14,
                borderRadius: 6,
                background: 'linear-gradient(to right,#000,#444)',
                boxShadow: '0 0 12px rgba(0,0,0,0.7)',
                opacity: 0.85,
                marginTop: '-3vh',
                marginBottom: '1.5vh',
              }}
            ></div>

            {/* ---------- GLOW TEXT ---------- */}
            <h2
              className="pulse"
              style={{
                fontWeight: 850,
                textShadow: '0 0 20px rgba(0,0,0,0.8)',
                margin: 0,
                fontSize: 'clamp(2.5rem, 3.2vw, 4.2rem)',
                lineHeight: 1.2,
                whiteSpace: 'normal',
                textAlign: 'center',
              }}
            >
              Fan Polling Zone
              <br />
              Starting Soon!!
            </h2>

            {/* Countdown always visible if set */}
            {poll.countdown && (
              <CountdownDisplay
                countdown={poll.countdown}
                countdownActive={!!poll.countdown_active}
                pollId={poll.id}
              />
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