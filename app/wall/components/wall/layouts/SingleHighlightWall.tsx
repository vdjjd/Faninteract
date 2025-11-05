'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { supabase } from '@/lib/supabaseClient';

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

export default function SingleHighlightWall({ event, posts }) {
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
      : event?.background_value ||
          'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );

  const [transitionType, setTransitionType] = useState(
    event?.post_transition || 'Fade In / Fade Out'
  );

  const [displayDuration, setDisplayDuration] = useState(
    speedMap[event?.transition_speed || 'Medium']
  );

  const transitionLock = useRef(false);

  /* ✅ Load approved posts on mount */
  useEffect(() => {
    if (!event?.id) return;
    supabase
      .from('guest_posts')
      .select('*')
      .eq('fan_wall_id', event.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setLivePosts(data));
  }, [event?.id]);

  /* ✅ Realtime post + wall update listener */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !event?.id) return;

    channel.on('broadcast', {}, ({ event: evt, payload }) => {
      if (!payload?.id || payload.id !== event.id) return;

      if (evt === 'wall_updated') {
        if (payload.background_value) {
          const newBg =
            payload.background_type === 'image'
              ? `url(${payload.background_value}) center/cover no-repeat`
              : payload.background_value;
          setBg(newBg);
        }
        if (payload.title) setTitle(payload.title);
        if (payload.logo_url) setLogo(payload.logo_url);
        if (payload.transition_speed)
          setDisplayDuration(speedMap[payload.transition_speed]);
        if (payload.post_transition)
          setTransitionType(payload.post_transition);
      }

      if (evt === 'post_added' && payload.status === 'approved') {
        setLivePosts(prev =>
          prev.some(p => p.id === payload.id) ? prev : [payload, ...prev]
        );
      }

      if (evt === 'wall_status_changed' && !transitionLock.current) {
        transitionLock.current = true;
        setFading(true);
        setTimeout(() => {
          setLive(payload.status === 'live');
          setFading(false);
          transitionLock.current = false;
        }, 1000);
      }
    });

    return () => channel.unsubscribe?.();
  }, [channelRef, event?.id]);

  /* ✅ Background realtime listener ONLY */
  useEffect(() => {
    if (!event?.id) return;

    const sub = supabase
      .channel(`wall_bg_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fan_walls',
          filter: `id=eq.${event.id}`,
        },
        payload => {
          const w = payload.new;
          if (w.background_value) {
            setBg(
              w.background_type === 'image'
                ? `url(${w.background_value}) center/cover no-repeat`
                : w.background_value
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [event?.id]);

  /* ✅ Rotate posts */
  useEffect(() => {
    if (!livePosts?.length) return;
    const interval = setInterval(
      () =>
        setCurrentIndex(i => (i + 1) % livePosts.length),
      displayDuration
    );
    return () => clearInterval(interval);
  }, [livePosts, displayDuration]);

  const transitionStyle =
    transitions[transitionType] || transitions['Fade In / Fade Out'];

  const current = livePosts[currentIndex % (livePosts.length || 1)];

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
      {/* Title */}
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

      {/* CONTENT CARD */}
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
        {/* PHOTO */}
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
                }}
              >
                No Photo
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT CONTENT */}
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
          {/* LOGO */}
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

          {/* GREY BAR */}
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
          />

          {/* MESSAGE */}
          <p
            style={{
              fontWeight: 700,
              margin: 0,
              fontSize: 'clamp(1.6rem, 2.5vw, 3rem)',
              textAlign: 'center',
              color: '#fff',
              textShadow: '0 0 8px rgba(0,0,0,0.6)',
            }}
          >
            {current?.message || 'Be the first to post!'}
          </p>
        </div>
      </div>

      {/* ✅ QR CODE + TEXT + FRAME BACK EXACTLY */}
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
            value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
            size={140}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
            style={{ borderRadius: 10, display: 'block' }}
          />
        </div>
      </div>

      {/* ✅ FULLSCREEN BUTTON BACK */}
      <button
        onClick={() =>
          !document.fullscreenElement
            ? document.documentElement.requestFullscreen()
            : document.exitFullscreen()
        }
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
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.boxShadow = '0 0 14px rgba(255,255,255,0.7)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={e => {
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
