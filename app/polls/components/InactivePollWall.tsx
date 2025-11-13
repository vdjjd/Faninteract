'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* ---------- COUNTDOWN COMPONENT ---------- */
function CountdownDisplay({ countdown, countdownActive, pollId }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [active, setActive] = useState(countdownActive);

  useEffect(() => {
    if (!countdown) return;
    const [numStr] = countdown.split(' ');
    const num = parseInt(numStr);
    const mins = countdown.toLowerCase().includes('minute');
    const secs = countdown.toLowerCase().includes('second');
    const total = mins ? num * 60 : secs ? num : 0;
    setTimeLeft(total);
    setActive(!!countdownActive);
  }, [countdown, countdownActive]);

  useEffect(() => {
    if (!active || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [active, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && active) {
      setActive(false);
      supabase
        .from('polls')
        .update({
          countdown_active: false,
          countdown: 'none',
          status: 'inactive',
        })
        .eq('id', pollId);
    }
  }, [timeLeft, active, pollId]);

  if (!countdown || countdown === 'none') return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <div
      style={{
        fontSize: 'clamp(6rem,8vw,9rem)',
        fontWeight: 900,
        color: '#fff',
        marginTop: '2vh',
        textShadow: '0 0 40px rgba(0,0,0,0.7)',
      }}
    >
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ INACTIVE POLL WALL — SAME VISUAL AS PRIZE WALL                           */
/* -------------------------------------------------------------------------- */
export default function InactivePollWall({ poll }) {
  const rt = useRealtimeChannel();
  const fullscreenButtonRef = useRef(null);

  const [bg, setBg] = useState('linear-gradient(to bottom right,#1b2735,#090a0f)');
  const [brightness, setBrightness] = useState(poll?.background_brightness || 100);
  const [wallState, setWallState] = useState({
    countdown: '',
    countdownActive: false,
    title: poll?.question || 'Upcoming Poll',
  });
  const updateTimeout = useRef(null);

  const PulseStyle = (
    <style>{`
      @keyframes pulseSoonGlow {
        0%,100% { opacity:.7; text-shadow:0 0 14px rgba(255,255,255,0.3); }
        50% { opacity:1; text-shadow:0 0 22px rgba(180,220,255,0.8); }
      }
      .pulseSoon { animation:pulseSoonGlow 2.5s ease-in-out infinite; }
    `}</style>
  );

  useEffect(() => {
    if (!poll) return;
    setWallState({
      countdown: poll.countdown || '',
      countdownActive: !!poll.countdown_active,
      title: poll.question || 'Upcoming Poll',
    });

    const value =
      poll.background_type === 'image'
        ? `url(${poll.background_value}) center/cover no-repeat`
        : poll.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

    setBg(value);
    if (poll.background_brightness !== undefined) setBrightness(poll.background_brightness);
  }, [poll]);

  /* ✅ Realtime channel updates */
  useEffect(() => {
    if (!rt?.current || !poll?.id) return;
    const channel = rt.current;
    const scheduleUpdate = (data) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(
        () => setWallState((prev) => ({ ...prev, ...data })),
        100
      );
    };

    channel.on('broadcast', {}, ({ event, payload }) => {
      if (!payload?.id || payload.id !== poll.id) return;

      if (event === 'poll_update') {
        if (payload.background_value) {
          const newBg =
            payload.background_type === 'image'
              ? `url(${payload.background_value}) center/cover no-repeat`
              : payload.background_value;
          setBg(newBg);
        }
        if (payload.background_brightness !== undefined)
          setBrightness(payload.background_brightness);
        if (payload.countdown) scheduleUpdate({ countdown: payload.countdown });
        if (payload.question) scheduleUpdate({ title: payload.question });
      }

      if (event === 'poll_status') {
        if (payload.countdown_active !== undefined)
          scheduleUpdate({ countdownActive: payload.countdown_active });
      }

      if (event === 'poll_countdown_finished')
        scheduleUpdate({ countdownActive: false });
    });

    return () => channel.unsubscribe?.();
  }, [rt, poll?.id]);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://faninteract.vercel.app';
  const qrValue = `${origin}/guest/signup?redirect=/polls/${poll?.id}/vote`;

  const displayLogo =
    poll?.host?.branding_logo_url?.trim()
      ? poll.host.branding_logo_url
      : '/faninteractlogo.png';

  const toggleFullscreen = () =>
    !document.fullscreenElement
      ? document.documentElement.requestFullscreen().catch(() => {})
      : document.exitFullscreen();

  if (!poll) return <div>Loading Poll Wall…</div>;

  return (
    <div
      style={{
        background: bg,
        filter: `brightness(${brightness}%)`,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        paddingTop: '3vh',
      }}
    >
      {PulseStyle}

      {/* Title */}
      <h1
        style={{
          color: '#fff',
          fontSize: 'clamp(2.5rem,3vw,5rem)',
          fontWeight: 900,
          marginBottom: '1vh',
          textShadow: `
            2px 2px 2px #000,
            -2px 2px 2px #000,
            2px -2px 2px #000,
            -2px -2px 2px #000
          `,
        }}
      >
        {wallState.title}
      </h1>

      {/* Main Panel */}
      <div
        style={{
          width: '90vw',
          height: '78vh',
          maxWidth: '1800px',
          aspectRatio: '16 / 9',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* QR Side */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '3%',
            width: '47%',
            height: '90%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCodeCanvas
            value={qrValue}
            size={1000}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 18,
            }}
          />
        </div>

        {/* Info Side */}
        <div
          style={{
            position: 'relative',
            flexGrow: 1,
            marginLeft: '44%',
          }}
        >
          {/* Logo */}
          <div
            style={{
              position: 'absolute',
              top: '6%',
              left: '53%',
              transform: 'translateX(-50%)',
              width: 'clamp(280px,28vw,420px)',
            }}
          >
            <img
              src={displayLogo}
              style={{
                width: '100%',
                height: 'auto',
                filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.85))',
              }}
            />
          </div>

          {/* Divider Bar */}
          <div
            style={{
              position: 'absolute',
              top: '48%',
              left: '53%',
              transform: 'translateX(-50%)',
              width: '75%',
              height: '1.4vh',
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
            }}
          />

          {/* Text */}
          <p
            style={{
              position: 'absolute',
              top: '50%',
              left: '53%',
              transform: 'translateX(-50%)',
              color: '#fff',
              fontSize: 'clamp(2em,3.5vw,6rem)',
              fontWeight: 900,
              margin: 0,
              textAlign: 'center',
              textShadow: '0 0 14px rgba(0,0,0,0.6)',
            }}
          >
            Fan Polling
          </p>

          <p
            className="pulseSoon"
            style={{
              position: 'absolute',
              top: '60%',
              left: '53%',
              transform: 'translateX(-50%)',
              color: '#bcd9ff',
              fontSize: 'clamp(2.8rem,2.4vw,3.2rem)',
              fontWeight: 700,
              textAlign: 'center',
              margin: 0,
            }}
          >
            Starting Soon!!
          </p>

          <div
            style={{
              position: 'absolute',
              top: '73%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <CountdownDisplay
              countdown={wallState.countdown}
              countdownActive={wallState.countdownActive}
              pollId={poll.id}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Button */}
      <div
        ref={fullscreenButtonRef}
        style={{
          position: 'absolute',
          bottom: 'calc(1.5vh + 1.5%)',
          right: 'calc(1.5vw + 1.5%)',
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.15,
          transition: 'opacity 0.2s ease',
          zIndex: 50,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
        onClick={toggleFullscreen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          stroke="white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          style={{ width: 28, height: 28 }}
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
