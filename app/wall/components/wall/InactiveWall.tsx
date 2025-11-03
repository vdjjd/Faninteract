'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';

/* ---------- COUNTDOWN DISPLAY ---------- */
function CountdownDisplay({
  countdown,
  countdownActive,
}: {
  countdown?: string;
  countdownActive?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [active, setActive] = useState(countdownActive);

  const parseCountdown = (text?: string) => {
    if (!text) return 0;
    const num = parseInt(text.split(' ')[0]);
    const mins = text.toLowerCase().includes('minute');
    const secs = text.toLowerCase().includes('second');
    return mins ? num * 60 : secs ? num : 0;
  };

  useEffect(() => setTimeLeft(parseCountdown(countdown)), [countdown]);

  useEffect(() => {
    setActive(!!countdownActive);
    setTimeLeft(parseCountdown(countdown));
  }, [countdownActive, countdown]);

  useEffect(() => {
    if (!active || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 1 ? t - 1 : 0));
    }, 1000);
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
/* 🧱 INACTIVE WALL DISPLAY                                                   */
/* -------------------------------------------------------------------------- */
export default function InactiveWall({ wall }: { wall: any }) {
  const [bg, setBg] = useState('linear-gradient(to bottom right,#1b2735,#090a0f)');
  const [localCountdown, setLocalCountdown] = useState('');
  const [localCountdownActive, setLocalCountdownActive] = useState(false);
  const [localTitle, setLocalTitle] = useState('');

  useEffect(() => {
    if (!wall) return;
    setLocalCountdown(wall.countdown || '');
    setLocalCountdownActive(wall.countdown_active ?? false);
    setLocalTitle(wall.title || '');
    if (wall.background_type === 'image')
      setBg(`url(${wall.background_value}) center/cover no-repeat`);
    else setBg(wall.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)');
  }, [wall]);

  if (!wall) return <div>Loading Wall…</div>;

  const displayLogo = wall?.host?.branding_logo_url || '/faninteractlogo.png';

  const handleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) elem.requestFullscreen();
    else document.exitFullscreen();
  };

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
        {localTitle || 'Fan Zone Wall'}
      </h1>

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
        <QRCodeCanvas
          value={`https://faninteract.vercel.app/submit/${wall?.id || ''}`}
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

        <img
          src={displayLogo}
          alt="Logo"
          style={{
            position: 'absolute',
            top: '25%',
            left: 'calc(40px + 620px + 60px)',
            transform: 'translateY(-50%)',
            width: 'clamp(600px, 22vw, 400px)',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(2px 2px 10px rgba(0,0,0,10))',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 'calc(25% + 180px)',
            left: 'calc(40px + 620px + 60px)',
            width: 'clamp(600px, 22vw, 400px)',
            textAlign: 'center',
            color: '#fff',
            fontWeight: 800,
            textShadow:
              '0 0 10px rgba(255,255,255,0.8), 0 0 30px rgba(100,150,255,0.6)',
            animation: 'pulseGlow 2.5s ease-in-out infinite',
          }}
        >
          <div style={{ fontSize: 'clamp(4rem, 2vw, 3.5rem)' }}>Fan Zone Wall</div>
          <div
            style={{
              fontSize: 'clamp(3rem, 2vw, 2.6rem)',
              marginTop: '0.4rem',
              color: '#bcd9ff',
            }}
          >
            Starting Soon!!
          </div>
        </div>

        {localCountdown && localCountdown !== 'none' && (
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
            <CountdownDisplay
              countdown={localCountdown}
              countdownActive={localCountdownActive}
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
          fontSize: '1.2rem',
          opacity: 0.1,
          cursor: 'pointer',
          transition: 'all 0.35s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.boxShadow = '0 0 14px rgba(255,255,255,0.7)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.1';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
      >
        ⛶
      </button>
    </div>
  );
}
