'use client';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import AdOverlay from '@/app/wall/components/AdOverlay';
import { useAdInjector } from '@/hooks/useAdInjector';

/* ✅ Transition styles */
const transitions: Record<string, any> = {
  'Fade In / Fade Out': {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.8, ease: 'easeInOut' },
  },
  'Slide Up / Slide Out': {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -100 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Slide Down / Slide Out': {
    initial: { opacity: 0, y: -100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 100 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Slide Left / Slide Right': {
    initial: { opacity: 0, x: 120 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -120 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Slide Right / Slide Left': {
    initial: { opacity: 0, x: -120 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 120 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Zoom In / Zoom Out': {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.15 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Zoom Out / Zoom In': {
    initial: { opacity: 0, scale: 1.15 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.85 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  Flip: {
    initial: { opacity: 0, rotateY: 180 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: -180 },
    transition: { duration: 1, ease: 'easeInOut' },
  },
  'Rotate In / Rotate Out': {
    initial: { opacity: 0, rotate: -30, scale: 0.9 },
    animate: { opacity: 1, rotate: 0, scale: 1 },
    exit: { opacity: 0, rotate: 30, scale: 0.9 },
    transition: { duration: 1, ease: 'easeInOut' },
  },
  'Pop In / Pop Out': {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 },
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

/* ✅ Speed map — affects interval only */
const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function SingleHighlightWall({ event, posts }) {
  const [livePosts, setLivePosts] = useState(posts || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState(event?.title || 'Fan Zone Wall');
  const [logo, setLogo] = useState(event?.logo_url || '/faninteractlogo.png');
  const [bg, setBg] = useState(
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(135deg, #1b2735 0%, #1b2735 50%, #090a0f 100%)'
  );
  const [transitionType, setTransitionType] = useState(
    event?.post_transition || 'Fade In / Fade Out'
  );
  const [displayDuration, setDisplayDuration] = useState(
    speedMap[event?.transition_speed || 'Medium']
  );

  /* 🔗 Ad injector hook */
  const {
    ads,
    showAd,
    currentAdIndex,
    setShowAd,
    handlePostRotationTick,
    injectorEnabled,
  } = useAdInjector({
    hostId: event?.host_profile_id || event?.host_id || event?.id,
    triggerInterval: event?.trigger_interval || 8,
  });

  /* ✅ Load posts */
  useEffect(() => {
    const loadPosts = async () => {
      if (!event?.id) return;
      const { data } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('fan_wall_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (data) setLivePosts(data);
    };
    loadPosts();
  }, [event?.id]);

  /* ✅ Rotation logic + tick injector */
  useEffect(() => {
    if (!livePosts.length) return;

    let mounted = true;
    const interval = setInterval(() => {
      if (!mounted) return;
      setCurrentIndex((i) => {
        const next = (i + 1) % livePosts.length;
        handlePostRotationTick();
        return next;
      });
    }, displayDuration);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [livePosts, displayDuration, handlePostRotationTick]);

  /* ✅ 🔥 Realtime updates for wall properties */
  useEffect(() => {
    if (!event?.id) return;

    const wallChannel = supabase
      .channel(`wall_settings_${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fan_walls', filter: `id=eq.${event.id}` },
        (payload) => {
          const w = payload.new;
          if (!w) return;

          // background
          if (w.background_value) {
            setBg(
              w.background_type === 'image'
                ? `url(${w.background_value}) center/cover no-repeat`
                : w.background_value
            );
          }

          // title / logo / transition type / speed
          if (w.title) setTitle(w.title);
          if (w.logo_url) setLogo(w.logo_url);
          if (w.post_transition && w.post_transition !== transitionType)
            setTransitionType(w.post_transition);

          if (w.transition_speed) {
            const newDuration = speedMap[w.transition_speed] || speedMap['Medium'];
            if (newDuration !== displayDuration) setDisplayDuration(newDuration);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(wallChannel);
    };
  }, [event?.id, transitionType, displayDuration]);

  /* ✅ Active transition style */
  const transitionStyle =
    transitions[transitionType] || transitions['Fade In / Fade Out'];
  const current = livePosts[currentIndex % (livePosts.length || 1)];

  /* ✅ Render */
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

      {/* Main container */}
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
        {/* Left Image */}
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
            backgroundColor: 'transparent',
          }}
        >
          <AnimatePresence mode="popLayout">
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
                exit={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
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

        {/* Right Content */}
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
          {/* Logo */}
          <div style={{ width: 'clamp(280px,30vw,420px)', marginBottom: '1.5vh' }}>
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
          />

          <p
            style={{
              fontWeight: 900,
              margin: 0,
              fontSize: 'clamp(2.5rem,3vw,4rem)',
              textAlign: 'center',
              color: '#fff',
              textTransform: 'uppercase',
              textShadow: '0 0 15px rgba(0,0,0,0.8)',
              marginBottom: '1vh',
            }}
          >
            {current?.nickname || 'Guest'}
          </p>

          <p
            style={{
              fontWeight: 600,
              margin: 0,
              fontSize: 'clamp(1.4rem,2vw,2.6rem)',
              textAlign: 'center',
              color: '#fff',
              textShadow: '0 0 8px rgba(0,0,0,0.6)',
              maxWidth: '90%',
            }}
          >
            {current?.message || 'Be the first to post!'}
          </p>
        </div>
      </div>

      {/* QR Code */}
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          left: 5,
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
            fontSize: 'clamp(0.9rem,1.4vw,1.4rem)',
            marginBottom: 6,
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

      {/* Ad Overlay */}
      <AdOverlay
        showAd={showAd && injectorEnabled}
        ads={ads}
        currentAdIndex={currentAdIndex}
        onAdEnd={() => setShowAd(false)}
      />

      {/* Fullscreen Toggle */}
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
          opacity: 0.25,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'opacity 0.3s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
        onClick={() =>
          !document.fullscreenElement
            ? document.documentElement.requestFullscreen().catch(console.error)
            : document.exitFullscreen()
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          stroke="white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
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
