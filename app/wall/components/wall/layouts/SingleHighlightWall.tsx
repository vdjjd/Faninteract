'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* ---------- TRANSITION STYLES ---------- */
const transitions: Record<string, any> = {
  'Fade In / Fade Out': {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.8 },
  },
  'Slide Up / Slide Out': {
    initial: { y: 80, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -80, opacity: 0 },
    transition: { duration: 0.7 },
  },
  'Slide Down / Slide Out': {
    initial: { y: -80, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 80, opacity: 0 },
    transition: { duration: 0.7 },
  },
  'Slide Left / Slide Right': {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
    transition: { duration: 0.7 },
  },
  'Zoom In / Zoom Out': {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    transition: { duration: 0.6 },
  },
};

const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

/* -------------------------------------------------------------------------- */
/* 🧱 Single Highlight Wall (Realtime-Optimized)                              */
/* -------------------------------------------------------------------------- */
export default function SingleHighlightWall({
  event,
  posts,
}: {
  event?: any;
  posts?: any[];
}) {
  const channelRef = useRealtimeChannel();

  const [livePosts, setLivePosts] = useState(posts || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [live, setLive] = useState(event?.status === 'live');
  const [fading, setFading] = useState(false);
  const [title, setTitle] = useState(event?.title || 'Fan Zone Wall');
  const [logo, setLogo] = useState(event?.logo_url || '/faninteractlogo.png');
  const [bg, setBg] = useState(
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );
  const [transitionType, setTransitionType] = useState(
    event?.post_transition || 'Fade In / Fade Out'
  );
  const [displayDuration, setDisplayDuration] = useState(
    speedMap[event?.transition_speed || 'Medium']
  );

  const transitionLock = useRef(false);

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (posts?.length) setLivePosts(posts);
  }, [posts]);

  /* ---------- REALTIME LISTENER ---------- */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !event?.id) return;

    const handler = (payload: any) => {
      const { event: evt, payload: data } = payload;
      if (!data?.id || data.id !== event.id) return;

      // 🔹 Wall-wide updates (background, title, logo, speed)
      if (evt === 'wall_updated') {
        if (data.background_value) {
          const newBg =
            data.background_type === 'image'
              ? `url(${data.background_value}) center/cover no-repeat`
              : data.background_value;
          setBg(newBg);
        }
        if (data.title) setTitle(data.title);
        if (data.logo_url) setLogo(data.logo_url);
        if (data.transition_speed)
          setDisplayDuration(speedMap[data.transition_speed]);
        if (data.post_transition)
          setTransitionType(data.post_transition);
      }

      // 🔹 Status change (live / inactive)
      if (evt === 'wall_status_changed' && !transitionLock.current) {
        transitionLock.current = true;
        setFading(true);
        const isLive = data.status === 'live';
        setTimeout(() => {
          setLive(isLive);
          setFading(false);
          transitionLock.current = false;
        }, 1000);
      }

      // 🔹 New approved posts
      if (evt === 'post_added' && data.status === 'approved') {
        setLivePosts((prev) =>
          prev.some((p) => p.id === data.id) ? prev : [data, ...prev]
        );
      }
    };

    channel.on('broadcast', {}, handler);
    return () => {
      try {
        channel.unsubscribe?.();
      } catch {}
    };
  }, [channelRef, event?.id]);

  /* ---------- POST CYCLE ---------- */
  useEffect(() => {
    if (!livePosts?.length) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % livePosts.length);
    }, displayDuration);
    return () => clearInterval(interval);
  }, [livePosts, displayDuration]);

  const transitionStyle = transitions[transitionType] || transitions['Fade In / Fade Out'];
  const current = livePosts[currentIndex % (livePosts.length || 1)];

  /* ---------- FULLSCREEN ---------- */
  const handleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) elem.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  /* ---------- RENDER ---------- */
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
        opacity: fading ? 0.4 : 1,
        transition: 'opacity 0.8s ease-in-out, background 0.6s ease',
      }}
    >
      <h1
        style={{
          color: '#fff',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
          fontWeight: 900,
          marginTop: '3vh',
          marginBottom: '1.5vh',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
        }}
      >
        {title}
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
        {/* LEFT: PHOTO */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '40px',
            width: '42%',
            height: 'calc(100% - 80px)',
            overflow: 'hidden',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatePresence mode="wait">
            {current?.photo_url ? (
              <motion.img
                key={current.id}
                src={current.photo_url}
                {...transitionStyle}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 18,
                  boxShadow: '0 0 18px rgba(0,0,0,0.6)',
                }}
              />
            ) : (
              <motion.div
                key="no-photo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '2rem',
                  textAlign: 'center',
                }}
              >
                No Photo
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: TEXT + LOGO */}
        <div
          style={{
            flexGrow: 1,
            marginLeft: '44%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            height: '100%',
            paddingTop: '3vh',
          }}
        >
          <div style={{ width: 'clamp(280px, 30vw, 420px)', marginBottom: '1.5vh' }}>
            <img
              src={logo}
              alt="Logo"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.85))',
              }}
            />
          </div>

          <div
            style={{
              width: '90%',
              height: 16,
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 14px rgba(0,0,0,0.7)',
              opacity: 0.9,
              marginTop: '1vh',
              marginBottom: '2vh',
            }}
          ></div>

          <p
            style={{
              fontWeight: 700,
              margin: 0,
              fontSize: 'clamp(1.6rem, 2.5vw, 3rem)',
              lineHeight: 1.2,
              textAlign: 'center',
              color: '#fff',
              textShadow: '0 0 8px rgba(0,0,0,0.6)',
              transition: 'color 0.4s ease',
            }}
          >
            {current?.message || 'Loading posts…'}
          </p>
        </div>
      </div>

      {/* QR */}
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '5px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 'clamp(0.9rem, 1.4vw, 1.4rem)',
            marginBottom: '6px',
            textShadow:
              '0 0 12px rgba(255,255,255,0.8), 0 0 20px rgba(100,180,255,0.6)',
          }}
        >
          Scan Me To Join
        </p>
        <div
          style={{
            padding: 6,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            boxShadow:
              '0 0 25px rgba(255,255,255,0.6), 0 0 40px rgba(100,180,255,0.3), inset 0 0 10px rgba(0,0,0,0.4)',
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/submit/${event?.id}`}
            size={140}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
            style={{ borderRadius: 10, display: 'block' }}
          />
        </div>
      </div>

      {/* FULLSCREEN BUTTON */}
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
