'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
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
  Flip: {
    initial: { opacity: 0, rotateY: 180 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: -180 },
    transition: { duration: 1, ease: 'easeInOut' },
  },
};

const transitionKeys = Object.keys(transitions);
const speedMap: Record<string, number> = { Slow: 12000, Medium: 8000, Fast: 4000 };

export default function SingleHighlightWall({ event, posts }) {
  const rt = useRealtimeChannel();
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);

  const [livePosts, setLivePosts] = useState(posts || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState(event?.title || 'Fan Zone Wall');
  const [logo, setLogo] = useState(event?.logo_url || '/faninteractlogo.png');

  const [bg, setBg] = useState(
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(135deg,#1b2735,#090a0f)'
  );
  const [brightness, setBrightness] = useState(event?.background_brightness || 100);
  const [transitionType, setTransitionType] = useState(event?.post_transition || 'Fade In / Fade Out');
  const [randomTransition, setRandomTransition] = useState<string | null>(null);
  const [displayDuration, setDisplayDuration] = useState(speedMap[event?.transition_speed || 'Medium']);

  const { ads, showAd, currentAd, tick, injectorEnabled } = useAdInjector({
    hostId: event?.host_profile_id || event?.host_id || event?.id,
  });

  /* ---------- LISTEN TO wall_commands ---------- */
  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`wall_commands_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wall_commands',
          filter: `wall_id=eq.${event.id}`,
        },
        async (payload) => {
          const cmd = payload.new;
          if (!cmd) return;
          if (cmd.action?.toLowerCase().includes('reload')) window.location.reload();
          if (cmd.action?.toLowerCase().includes('fullscreen'))
            fullscreenButtonRef.current?.click();
          await supabase.from('wall_commands').delete().eq('id', cmd.id);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [event?.id]);

  /* ---------- Load + Poll Posts ---------- */
  useEffect(() => {
    if (!event?.id) return;
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('fan_wall_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (data) setLivePosts(data);
    };
    fetchPosts();
    const interval = setInterval(fetchPosts, 3000);
    return () => clearInterval(interval);
  }, [event?.id]);

  /* ---------- Realtime settings updates ---------- */
  useEffect(() => {
    if (!event?.id) return;
    const wallChannel = supabase
      .channel(`single_settings_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fan_walls',
          filter: `id=eq.${event.id}`,
        },
        (payload) => {
          const w = payload.new;
          if (!w) return;
          if (w.background_value)
            setBg(
              w.background_type === 'image'
                ? `url(${w.background_value}) center/cover no-repeat`
                : w.background_value
            );
          if (w.background_brightness !== undefined) setBrightness(w.background_brightness);
          if (w.title) setTitle(w.title);
          if (w.logo_url) setLogo(w.logo_url);
          if (w.post_transition) {
            setTransitionType(w.post_transition);
            setRandomTransition(null);
          }
          if (w.transition_speed)
            setDisplayDuration(speedMap[w.transition_speed]);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(wallChannel);
  }, [event?.id]);

  /* ---------- Rotation Engine ---------- */
  useEffect(() => {
    if (!livePosts.length || showAd) return;
    const rotation = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % livePosts.length);
      if (transitionType === 'Random') {
        const next = transitionKeys[Math.floor(Math.random() * transitionKeys.length)];
        setRandomTransition(next);
      }
      if (injectorEnabled) tick();
    }, displayDuration);
    return () => clearInterval(rotation);
  }, [livePosts.length, displayDuration, showAd, transitionType, injectorEnabled, tick]);

  const effectiveTransition =
    transitionType === 'Random'
      ? transitions[randomTransition || 'Fade In / Fade Out']
      : transitions[transitionType] || transitions['Fade In / Fade Out'];

  const current = livePosts[currentIndex % (livePosts.length || 1)];

  /* ---------- RENDER ---------- */
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        filter: `brightness(${brightness}%)`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Hidden Fullscreen Button */}
      <button
        ref={fullscreenButtonRef}
        style={{ display: 'none' }}
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen().catch(() => {});
          else document.exitFullscreen().catch(() => {});
        }}
      />

      {/* Title */}
      <h1
        style={{
          color: '#fff',
          fontSize: 'clamp(2rem,3vw,4rem)',
          fontWeight: 900,
          marginTop: '-1h',
          marginBottom: '0vh',
          textAlign: 'center',
           textShadow: `
      2px 2px 2px #000,
      -2px 2px 2px #000,
      2px -2px 2px #000,
      -2px -2px 2px #000
    `,
          }}
      >
        {title}
      </h1>

      {/* Main Container */}
      <div
        style={{
          width: 'min(92vw, 1800px)',
          height: 'min(83vh, 950px)',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left Photo */}
        <div
          style={{
            position: 'absolute',
            top: '4%',
            left: '2%',
            width: '46%',
            height: '92%',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <AnimatePresence mode="popLayout">
            {current?.photo_url ? (
              <motion.img
                key={current.id}
                src={current.photo_url}
                {...effectiveTransition}
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
                style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.6)' }}
              >
                No Photo
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side */}
        <div
          style={{
            flexGrow: 1,
            marginLeft: '46%',
            paddingTop: '4vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div style={{ width: 'clamp(260px,28vw,380px)' }}>
            <img
              src={logo}
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
              height: 14,
              marginTop: '2vh',
              marginBottom: '2vh',
              marginLeft: '3.5%', 
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
            }}
          />

          <p
            style={{
              fontSize: 'clamp(2rem,2.4vw,3.4rem)',
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {current?.nickname || 'Guest'}
          </p>

          <p
            style={{
              fontSize: 'clamp(4rem,2vw,2rem)',
              fontWeight: 600,
              color: '#fff',
              textAlign: 'center',
              maxWidth: '90%',
              marginTop: '1.2vh',
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
          bottom: '4.9vh',
          left: '4vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontWeight: 700,
            marginBottom: '0.3vh',
            fontSize: 'clamp(1rem,1.4vw,1.4rem)',
          }}
        >
          Scan To Join
        </p>

        <div
          style={{
            padding: 2,
            borderRadius: 30,
            background: 'rgba(255,255,255,0.08)',
            boxShadow:
              '0 0 25px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.3)',
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
            size={160}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            style={{ borderRadius: 12 }}
          />
        </div>
      </div>

      {/* Ad Overlay */}
      <AdOverlay showAd={showAd && injectorEnabled} currentAd={currentAd} onAdEnd={() => {}} />

      {/* ✅ Fullscreen Button — centered near frosted box corner */}
      <div
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
          transition: 'opacity 0.1s ease',
          zIndex: 50,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
        onClick={() => fullscreenButtonRef.current?.click()}
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
