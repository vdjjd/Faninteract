'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* ---------- COUNTDOWN COMPONENT ---------- */
function CountdownDisplay({ countdown, countdownActive, wheelId }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [active, setActive] = useState(countdownActive);

  /* ✅ Parse countdown */
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

  /* ✅ Run timer */
  useEffect(() => {
    if (!active || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => (t > 1 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [active, timeLeft]);

  /* ✅ When timer hits zero → Update DB + fade to Active Wall */
  useEffect(() => {
    if (timeLeft === 0 && active) {
      setActive(false);

      supabase
        .from('prize_wheels')
        .update({
          countdown_active: false,
          countdown: 'none',
          status: 'live'       // ✅ makes router fade to Active Wall
        })
        .eq('id', wheelId);
    }
  }, [timeLeft, active, wheelId]);

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
/* ✅ PRIZE WHEEL INACTIVE WALL                                               */
/* -------------------------------------------------------------------------- */
export default function InactivePrizeWall({ wheel }) {
  const rt = useRealtimeChannel();

  const [bg, setBg] = useState(
    'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );

  const [brightness, setBrightness] = useState(
    wheel?.background_brightness || 100
  );

  const [wallState, setWallState] = useState({
    countdown: '',
    countdownActive: false,
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

  /* ✅ Initial load */
  useEffect(() => {
    if (!wheel) return;

    setWallState({
      countdown: wheel.countdown || '',
      countdownActive: !!wheel.countdown_active,
    });

    const value =
      wheel.background_type === 'image'
        ? `url(${wheel.background_value}) center/cover no-repeat`
        : wheel.background_value ||
          'linear-gradient(to bottom right,#1b2735,#090a0f)';

    setBg(value);

    if (wheel.background_brightness !== undefined) {
      setBrightness(wheel.background_brightness);
    }
  }, [wheel]);

  /* ✅ Realtime updates */
  useEffect(() => {
    if (!rt?.current || !wheel?.id) return;
    const channel = rt.current;

    const scheduleUpdate = (data) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(
        () => setWallState(prev => ({ ...prev, ...data })),
        100
      );
    };

    channel.on('broadcast', {}, ({ event, payload }) => {
      if (!payload?.id || payload.id !== wheel.id) return;

      if (event === 'prizewheel_update') {
        if (payload.background_value) {
          const newBg =
            payload.background_type === 'image'
              ? `url(${payload.background_value}) center/cover no-repeat`
              : payload.background_value;
          setBg(newBg);
        }

        if (payload.background_brightness !== undefined)
          setBrightness(payload.background_brightness);

        if (payload.countdown)
          scheduleUpdate({ countdown: payload.countdown });
      }

      if (event === 'prizewheel_status') {
        if (payload.countdown_active !== undefined)
          scheduleUpdate({ countdownActive: payload.countdown_active });
      }

      if (event === 'prizewheel_countdown_finished') {
        scheduleUpdate({ countdownActive: false });
      }
    });

    return () => channel.unsubscribe?.();
  }, [rt, wheel?.id]);

  /* ✅ QR logic */
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://faninteract.vercel.app';

  const qrValue =
  wheel?.qr_url ||
  `${origin}/guest/signup?redirect=/prizewheel/${wheel.id}/submit`;

  /* ✅ Logo */
  const displayLogo =
    wheel?.host?.branding_logo_url?.trim()
      ? wheel.host.branding_logo_url
      : '/faninteractlogo.png';

  const toggleFullscreen = () =>
    !document.fullscreenElement
      ? document.documentElement.requestFullscreen().catch(() => {})
      : document.exitFullscreen();

  if (!wheel) return <div>Loading Prize Wheel…</div>;

  return (
    <div
      style={{
        background: bg,
        filter: `brightness(${brightness}%)`,
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
        Prize Wheel
      </h1>

      {/* Main Panel */}
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
        {/* QR Box */}
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
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 18,
            }}
          />
        </div>

        {/* ---------- RIGHT COLUMN ---------- */}
        <div
          style={{
            position: 'relative',
            flexGrow: 1,
            marginLeft: '44%',
          }}
        >
          {/* LOGO */}
          <div
            style={{
              position: 'absolute',
              top: '6%',
              left: '50%',
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

          {/* GREY BAR */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '78%',
              height: 16,
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
            }}
          />

          {/* PRIZE WHEEL TEXT */}
          <p
            style={{
              position: 'absolute',
              top: '55%',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#fff',
              fontSize: 'clamp(2.5rem,3vw,10rem)',
              fontWeight: 900,
              margin: 0,
              textAlign: 'center',
            }}
          >
            Prize Wheel
          </p>

          {/* STARTING SOON */}
          <p
            className="pulseSoon"
            style={{
              position: 'absolute',
              top: '65%',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#bcd9ff',
              fontSize: 'clamp(2.6rem,2.4vw,3rem)',
              fontWeight: 700,
              margin: 0,
              textAlign: 'center',
            }}
          >
            Starting Soon!!
          </p>

          {/* COUNTDOWN */}
          <div
            style={{
              position: 'absolute',
              top: '67%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <CountdownDisplay
              countdown={wallState.countdown}
              countdownActive={wallState.countdownActive}
              wheelId={wheel.id}     // ✅ Added required prop
            />
          </div>
        </div>
      </div>

      {/* Fullscreen button */}
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
