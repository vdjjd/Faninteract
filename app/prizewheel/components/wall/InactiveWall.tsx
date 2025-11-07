'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* ---------- COUNTDOWN DISPLAY ---------- */
function CountdownDisplay({ countdown, countdownActive }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [originalTime, setOriginalTime] = useState(0);

  useEffect(() => {
    if (!countdown) return;

    const [numStr] = countdown.split(' ');
    const num = parseInt(numStr);

    const mins = countdown.toLowerCase().includes('min');
    const secs = countdown.toLowerCase().includes('sec');

    const total = mins ? num * 60 : secs ? num : 0;

    setTimeLeft(total);
    setOriginalTime(total);
  }, [countdown]);

  useEffect(() => {
    if (!countdownActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(t => (t > 1 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive, timeLeft]);

  useEffect(() => {
    if (!countdownActive) setTimeLeft(originalTime);
  }, [countdownActive, originalTime]);

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
/* ✅ INACTIVE PRIZE WHEEL WALL WITH REALTIME                                */
/* -------------------------------------------------------------------------- */
export default function InactivePrizeWall({ event }) {
  const realtime = useRealtimeChannel();

  const [bg, setBg] = useState(
    'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );

  const [wheelState, setWheelState] = useState({
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

  /* ✅ Load initial event values */
  useEffect(() => {
    if (!event) return;

    setWheelState({
      countdown: event.countdown || '',
      countdownActive: !!event.countdown_active,
      title: event.title || '',
    });

    const value =
      event.background_type === 'image'
        ? `url(${event.background_value}) center/cover no-repeat`
        : event.background_value ||
          'linear-gradient(to bottom right,#1b2735,#090a0f)';

    const t = setTimeout(() => setBg(value), 100);
    return () => clearTimeout(t);
  }, [event]);

  /* ✅ Realtime Updates */
  useEffect(() => {
    if (!realtime?.current || !event?.id) return;

    const channel = realtime.current;

    const schedule = patch => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setWheelState(prev => ({ ...prev, ...patch }));
      }, 80);
    };

    const handler = ({ event: evtName, payload }) => {
      if (!payload?.id || payload.id !== event.id) return;

      if (evtName === 'prizewheel_updated') {
        if (payload.background_value) {
          const newBg =
            payload.background_type === 'image'
              ? `url(${payload.background_value}) center/cover no-repeat`
              : payload.background_value;
          setBg(newBg);
        }

        if (payload.title) schedule({ title: payload.title });
        if (payload.countdown) schedule({ countdown: payload.countdown });
      }

      if (evtName === 'prizewheel_status_changed') {
        schedule({ countdownActive: payload.countdown_active });
      }

      if (evtName === 'countdown_finished') {
        schedule({ countdownActive: false });
      }
    };

    channel.on('broadcast', { event: '*' }, handler);

    return () => channel.unsubscribe?.();
  }, [realtime, event?.id]);

  /* ✅ QR origin */
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://faninteract.vercel.app';

  const qrValue = useMemo(
    () => `${origin}/prizewheel/submit/${event?.id}`,
    [event?.id, origin]
  );

  /* ✅ Logo selection */
  const displayLogo =
    event?.host?.branding_logo_url?.trim()
      ? event.host.branding_logo_url
      : event?.logo_url?.trim()
      ? event.logo_url
      : '/faninteractlogo.png';

  /* ✅ Fullscreen */
  const handleFullscreen = () => {
    const el = document.documentElement;

    !document.fullscreenElement
      ? el.requestFullscreen().catch(() => {})
      : document.exitFullscreen();
  };

  if (!event)
    return (
      <div
        style={{
          background: 'black',
          height: '100vh',
          color: 'white',
          fontSize: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Loading…
      </div>
    );

  /* ✅ Render wall (unchanged visually) */
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
        padding: '2vh 2vw',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background 0.8s ease',
      }}
    >
      {PulseStyle}

      <h1
        style={{
          color: '#fff',
          textShadow: '0 0 12px rgba(0,0,0,0.6)',
          textAlign: 'center',
          fontWeight: 900,
          marginTop: '3vh',
          marginBottom: '1.5vh',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
        }}
      >
        {wheelState.title || 'Prize Wheel'}
      </h1>

      {/* ✅ PANEL (unchanged) */}
      <div
        style={{
          width: '90vw',
          height: '78vh',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
          position: 'relative',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
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
            left: 40,
            transform: 'translateY(-50%)',
            borderRadius: 16,
            boxShadow: '0 0 18px rgba(0,0,0,0.6)',
          }}
        />

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
            filter: 'drop-shadow(2px 2px 10px rgba(0,0,0,1))',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 'calc(25% + 160px)',
            left: 'calc(40px + 620px + 60px)',
            width: 'clamp(600px, 22vw, 400px)',
            height: 14,
            borderRadius: 6,
            background: 'linear-gradient(to right,#000,#444)',
            opacity: 0.85,
            boxShadow: '0 0 12px rgba(0,0,0,0.7)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 'calc(25% + 190px)',
            left: 'calc(40px + 620px + 60px)',
            width: 'clamp(600px, 22vw, 400px)',
            textAlign: 'center',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          <div style={{ fontSize: 'clamp(4rem, 2vw, 3.5rem)' }}>
            Prize Wheel
          </div>

          <div
            className="pulseSoon"
            style={{
              fontSize: 'clamp(3rem, 2vw, 2.6rem)',
              color: '#bcd9ff',
            }}
          >
            Starting Soon!!
          </div>
        </div>

        {wheelState.countdown &&
          wheelState.countdown !== 'none' &&
          wheelState.countdown.trim() !== '' && (
            <div
              style={{
                position: 'absolute',
                top: '85%',
                left: 'calc(40px + 620px + 60px)',
                width: 'clamp(600px, 22vw, 400px)',
                transform: 'translateY(-50%)',
                textAlign: 'center',
              }}
            >
              <CountdownDisplay
                countdown={wheelState.countdown}
                countdownActive={wheelState.countdownActive}
              />
            </div>
          )}
      </div>

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
          opacity: 0.15,
          cursor: 'pointer',
          transition: '0.3s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.15')}
      >
        ⛶
      </button>
    </div>
  );
}
