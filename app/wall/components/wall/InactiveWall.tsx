'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState, useRef } from 'react';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* ---------- COUNTDOWN COMPONENT ---------- */
function CountdownDisplay({ countdown, countdownActive }) {
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
    const timer = setInterval(() => {
      setTimeLeft(t => (t > 1 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [active, timeLeft]);

  if (!countdown || countdown === 'none') return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <div
      style={{
        fontSize: 'clamp(3rem,4vw,5rem)',
        fontWeight: 900,
        color: '#fff',
        marginTop: '1vh',
        textShadow: '0 0 30px rgba(0,0,0,0.8)',
      }}
    >
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ INACTIVE WALL (patched with brightness support)                          */
/* -------------------------------------------------------------------------- */
export default function InactiveWall({ wall }) {
  const rt = useRealtimeChannel();

  const [bg, setBg] = useState(
    'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );

  /* ✅ NEW — brightness state */
  const [brightness, setBrightness] = useState(
    wall?.background_brightness || 100
  );

  const [wallState, setWallState] = useState({
    countdown: '',
    countdownActive: false,
    title: '',
  });

  const updateTimeout = useRef(null);

  /* ✅ Glow animation */
  const PulseStyle = (
    <style>{`
      @keyframes pulseSoonGlow {
        0%,100% { opacity: .7; text-shadow: 0 0 14px rgba(255,255,255,0.3); }
        50% { opacity: 1; text-shadow: 0 0 22px rgba(180,220,255,0.8); }
      }
      .pulseSoon { animation: pulseSoonGlow 2.5s ease-in-out infinite; }
    `}</style>
  );

  /* ✅ Load initial values */
  useEffect(() => {
    if (!wall) return;

    setWallState({
      countdown: wall.countdown || '',
      countdownActive: !!wall.countdown_active,
      title: wall.title || '',
    });

    const value =
      wall.background_type === 'image'
        ? `url(${wall.background_value}) center/cover no-repeat`
        : wall.background_value ||
          'linear-gradient(to bottom right,#1b2735,#090a0f)';

    setBg(value);

    /* ✅ NEW — load brightness */
    if (wall.background_brightness !== undefined) {
      setBrightness(wall.background_brightness);
    }
  }, [wall]);

  /* ✅ Listen for realtime updates */
  useEffect(() => {
    if (!rt?.current || !wall?.id) return;
    const channel = rt.current;

    const scheduleUpdate = (data) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setWallState(prev => ({ ...prev, ...data }));
      }, 100);
    };

    channel.on('broadcast', {}, ({ event, payload }) => {
      if (!payload?.id || payload.id !== wall.id) return;

      if (event === 'wall_updated') {
        if (payload.background_value) {
          const newBg =
            payload.background_type === 'image'
              ? `url(${payload.background_value}) center/cover no-repeat`
              : payload.background_value;
          setBg(newBg);
        }

        /* ✅ NEW — brightness from modal */
        if (payload.background_brightness !== undefined) {
          setBrightness(payload.background_brightness);
        }

        if (payload.title) scheduleUpdate({ title: payload.title });
        if (payload.countdown) scheduleUpdate({ countdown: payload.countdown });
      }

      if (event === 'wall_status_changed') {
        if (payload.countdown_active !== undefined)
          scheduleUpdate({ countdownActive: payload.countdown_active });
      }

      if (event === 'countdown_finished') {
        scheduleUpdate({ countdownActive: false });
      }
    });

    return () => channel.unsubscribe?.();
  }, [rt, wall?.id]);

  /* ✅ QR link origin */
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://faninteract.vercel.app';

  const qrValue = `${origin}/guest/signup?wall=${wall?.id}`;

  const displayLogo =
    wall?.host?.branding_logo_url?.trim()
      ? wall.host.branding_logo_url
      : '/faninteractlogo.png';

  const toggleFullscreen = () =>
    !document.fullscreenElement
      ? document.documentElement.requestFullscreen().catch(() => {})
      : document.exitFullscreen();

  if (!wall) return <div>Loading Wall…</div>;

  return (
    <div
      style={{
        background: bg,
        filter: `brightness(${brightness}%)`,   /* ✅ NEW brightness filter */
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        paddingTop: '3vh',
      }}
    >
      {PulseStyle}

      {/* Title */}
      <h1
        style={{
          color: '#fff',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
          fontWeight: 900,
          marginBottom: '1.5vh',
          textShadow: '0 0 12px rgba(0,0,0,0.5)',
        }}
      >
        {wallState.title || 'Fan Zone Wall'}
      </h1>

      {/* Main panel */}
      <div
        style={{
          width: '90vw',
          height: '78vh',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* QR container */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            width: '42%',
            height: 'calc(100% - 80px)',
            borderRadius: 18,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.12)',
          }}
        >
          <QRCodeCanvas
            value={qrValue}
            size={600}
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

        {/* Right column */}
        <div
          style={{
            flexGrow: 1,
            marginLeft: '44%',
            paddingTop: '3vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ width: 'clamp(280px,30vw,420px)' }}>
            <img
              src={displayLogo}
              style={{
                width: '100%',
                height: 'auto',
                filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.85))',
              }}
            />
          </div>

          <div
            style={{
              width: '90%',
              height: 16,
              marginTop: '2vh',
              marginBottom: '2vh',
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
            }}
          />

          <p
            style={{
              color: '#fff',
              fontSize: 'clamp(2.4rem,3vw,4rem)',
              fontWeight: 900,
              margin: 0,
              textAlign: 'center',
            }}
          >
            Fan Zone Wall
          </p>

          <p
            className="pulseSoon"
            style={{
              color: '#bcd9ff',
              fontSize: 'clamp(1.8rem,2.4vw,3rem)',
              marginTop: '1vh',
              textAlign: 'center',
              fontWeight: 700,
            }}
          >
            Starting Soon!!
          </p>

          <CountdownDisplay
            countdown={wallState.countdown}
            countdownActive={wallState.countdownActive}
          />
        </div>
      </div>

      {/* Fullscreen */}
      <div
        onClick={toggleFullscreen}
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.25,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
      >
        ⛶
      </div>
    </div>
  );
}
