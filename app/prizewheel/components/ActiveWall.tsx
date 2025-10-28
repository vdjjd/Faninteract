'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function ActiveWall({ event }: { event: any }) {
  const [spinSpeed, setSpinSpeed] = useState(event?.spin_speed || 'Medium');
  const [spinning, setSpinning] = useState(false);
  const controls = useAnimation();

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  const displayLogo =
    event?.host?.branding_logo_url ||
    event?.logo_url ||
    '/faninteractlogo.png';

  /* ---------- Spin Durations ---------- */
  const spinDurations: Record<string, number> = {
    Short: 10,
    Medium: 15,
    Long: 20,
  };

  /* ---------- Listen for Spin Trigger ---------- */
  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`prizewheel-${event.id}`)
      .on('broadcast', { event: 'spin_trigger' }, async () => {
        console.log('🎡 Spin trigger received!');
        startSpin();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, spinSpeed]);

  /* ---------- Start Spin ---------- */
  async function startSpin() {
    if (spinning) return;
    setSpinning(true);

    const duration = spinDurations[spinSpeed] || 15;
    const randomAngle = 360 * 10 + Math.floor(Math.random() * 360); // 10 full spins + random stop

    await controls.start({
      rotate: randomAngle,
      transition: {
        duration: duration,
        ease: [0.2, 0.9, 0.3, 1],
      },
    });

    // Reset angle after stop to prevent overflow
    controls.set({ rotate: randomAngle % 360 });
    setSpinning(false);
  }

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
      }}
    >
      {/* ---------- TITLE ---------- */}
      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          textShadow: '0 0 25px rgba(0,0,0,0.7)',
          fontWeight: 900,
          letterSpacing: '1px',
          marginTop: '4vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem, 4vw, 5rem)',
        }}
      >
        {event?.title || 'Prize Wheel'}
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ---------- WHEEL ---------- */}
        <motion.img
          src="/wheel.png"
          alt="Prize Wheel"
          animate={controls}
          initial={{ rotate: 0 }}
          style={{
            width: 'clamp(400px, 65vw, 800px)',
            height: 'auto',
            filter: 'drop-shadow(0 0 25px rgba(0,0,0,0.8))',
          }}
        />

        {/* ---------- CENTER LOGO ---------- */}
        <img
          src={displayLogo}
          alt="Center Logo"
          style={{
            position: 'absolute',
            width: '18%',
            height: '18%',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid rgba(255,255,255,0.8)',
            boxShadow: '0 0 15px rgba(0,0,0,0.7)',
          }}
        />

        {/* ---------- TOP ARROW ---------- */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '18px solid transparent',
            borderRight: '18px solid transparent',
            borderBottom: '35px solid #ffcc00',
            filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))',
          }}
        />
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
  );
}