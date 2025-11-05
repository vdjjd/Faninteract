'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* ---------- COUNTDOWN DISPLAY ---------- */
function CountdownDisplay({ countdown, countdownActive }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [active, setActive] = useState(countdownActive);

  const totalSeconds = useMemo(() => {
    if (!countdown) return 0;
    const [numStr] = countdown.split(' ');
    const num = parseInt(numStr);
    const isMinute = countdown.toLowerCase().includes('minute');
    const isSecond = countdown.toLowerCase().includes('second');
    return isMinute ? num * 60 : isSecond ? num : 0;
  }, [countdown]);

  useEffect(() => {
    setTimeLeft(totalSeconds);
    setActive(!!countdownActive);
  }, [totalSeconds, countdownActive]);

  useEffect(() => {
    if (!active || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [active, timeLeft]);

  if (!countdown || countdown === 'none') return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <div
      style={{
        fontSize: 'clamp(6rem,8vw,9rem)',
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 0 40px rgba(0,0,0,0.7)',
        textAlign: 'center',
        marginTop: '2vh',
      }}
    >
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INACTIVE WALL                                                              */
/* -------------------------------------------------------------------------- */
export default function InactiveWall({ wall }) {
  const channelRef = useRealtimeChannel();
  const [bg, setBg] = useState('linear-gradient(to bottom right,#1b2735,#090a0f)');
  const [wallState, setWallState] = useState({
    countdown: '',
    countdownActive: false,
    title: '',
  });

  const updateTimeout = useRef(null);

  const PulseStyle = (
    <style>{`
      @keyframes pulseGlow {
        0%, 100% { text-shadow: 0 0 18px rgba(255,255,255,0.3), 0 0 36px rgba(255,255,255,0.2); opacity: 0.95; }
        50% { text-shadow: 0 0 28px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.5); opacity: 1; }
      }
      .pulseSoon { animation: pulseGlow 2.5s ease-in-out infinite; }
    `}</style>
  );

  /* ✅ Load initial */
  useEffect(() => {
    if (!wall) return;
    setWallState({
      countdown: wall.countdown || '',
      countdownActive: !!wall.countdown_active,
      title: wall.title || '',
    });

    const value = wall.background_type === 'image'
      ? `url(${wall.background_value}) center/cover no-repeat`
      : wall.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

    const t = setTimeout(() => setBg(value), 100);
    return () => clearTimeout(t);
  }, [wall]);

  /* ✅ Realtime updates */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !wall?.id) return;

    const scheduleUpdate = (patch) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setWallState((prev) => ({ ...prev, ...patch }));
      }, 100);
    };

    const handleBroadcast = ({ event, payload }) => {
      if (!payload?.id || payload.id !== wall.id) return;

      switch (event) {
        case 'wall_updated':
          if (payload.background_value) {
            const newBg =
              payload.background_type === 'image'
                ? `url(${payload.background_value}) center/cover no-repeat`
                : payload.background_value;
            setBg(newBg);
          }
          if (payload.title) scheduleUpdate({ title: payload.title });
          if (payload.countdown) scheduleUpdate({ countdown: payload.countdown });
          break;

        case 'wall_status_changed':
          if (payload.countdown_active !== undefined)
            scheduleUpdate({ countdownActive: payload.countdown_active });
          break;

        case 'countdown_finished':
          scheduleUpdate({ countdownActive: false });
          break;
      }
    };

    channel.on('broadcast', {}, handleBroadcast);
    return () => channel.unsubscribe?.();
  }, [channelRef, wall?.id]);

  /* ✅ Dynamic origin + QR */
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://faninteract.vercel.app';

  const qrValue = useMemo(
    () => `${origin}/guest/signup?wall=${wall?.id}`,
    [wall?.id, origin]
  );

  /* ✅ Host logo */
  const displayLogo =
    wall?.host?.branding_logo_url?.trim()
      ? wall.host.branding_logo_url
      : '/faninteractlogo.png';

  /* ✅ Fullscreen */
  const handleFullscreen = () => {
    const el = document.documentElement;
    !document.fullscreenElement
      ? el.requestFullscreen().catch(() => {})
      : document.exitFullscreen();
  };

  if (!wall) return <div>Loading Wall…</div>;

  return (
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
        position: 'relative',
        transition: 'background 0.8s ease',
        padding: '2vh 2vw',
      }}
    >
      {PulseStyle}

      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          fontWeight: 900,
          marginTop: '3vh',
          marginBottom: '1.5vh',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
          textShadow: '0 0 12px rgba(0,0,0,0.6)',
        }}
      >
        {wallState.title || 'Fan Zone Wall'}
      </h1>

      {/* Panel */}
      <div
        style={{
          width: '90vw',
          height: '78vh',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 24,
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.15)',
          position: 'relative',
          display: 'flex',
          overflow: 'hidden',
        }}
      >

        {/* ✅ NEW QR PATH */}
        <QRCodeCanvas
          value={qrValue}
          size={620}
          bgColor="#fff"
          fgColor="#000"
          level="H"
          includeMargin={false}
          style={{
            position: 'absolute',
            top: '50%',
            left: '40px',
            transform: 'translateY(-50%)',
            borderRadius: 16,
            boxShadow: '0 0 18px rgba(0,0,0,0.6)',
          }}
        />

        {/* Logo */}
        <img
          src={displayLogo}
          alt="Logo"
          style={{
            position: 'absolute',
            top: '25%',
            left: 'calc(40px + 620px + 60px)',
            transform: 'translateY(-50%)',
            width: 'clamp(600px, 22vw, 400px)',
            objectFit: 'contain',
            filter: 'drop-shadow(2px 2px 10px rgba(0,0,0,10))',
          }}
        />

        {/* Grey bar */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(25% + 160px)',
            left: 'calc(40px + 620px + 60px)',
            width: 'clamp(600px, 22vw, 400px)',
            height: 14,
            borderRadius: 6,
            background: 'linear-gradient(to right,#000,#444)',
            boxShadow: '0 0 12px rgba(0,0,0,0.7)',
            opacity: 0.85,
          }}
        />

        {/* Text */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(25% + 180px)',
            left: 'calc(40px + 620px + 60px)',
            width: 'clamp(600px, 22vw, 400px)',
            textAlign: 'center',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          <div style={{ fontSize: 'clamp(4rem, 2vw, 3.5rem)' }}>
            Fan Zone Wall
          </div>

          <div className="pulseSoon" style={{ fontSize: 'clamp(3rem, 2vw, 2.6rem)', color: '#bcd9ff' }}>
            Starting Soon!!
          </div>
        </div>

        {wallState.countdown && wallState.countdown !== 'none' && (
          <div
            style={{
              position: 'absolute',
              top: '85%',
              left: 'calc(40px + 620px + 60px)',
              transform: 'translateY(-50%)',
              width: 'clamp(600px, 22vw, 400px)',
              textAlign: 'center',
            }}
          >
            <CountdownDisplay countdown={wallState.countdown} countdownActive={wallState.countdownActive} />
          </div>
        )}
      </div>

      {/* Fullscreen */}
      <button
        onClick={handleFullscreen}
        style={{
          position: 'absolute',
          bottom: '2vh',
          right: '2vw',
          width: 45,
          height: 45,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          fontSize: '1.2rem',
          opacity: 0.15,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.15')}
      >
        ⛶
      </button>
    </div>
  );
}
