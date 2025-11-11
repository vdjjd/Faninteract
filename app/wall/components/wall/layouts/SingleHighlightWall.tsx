'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import AdOverlay from '@/app/wall/components/AdOverlay';
import { useAdInjector } from '@/hooks/useAdInjector';

/* ✅ Transition styles */
const transitions: Record<string, any> = {
  'Fade In / Fade Out': { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.8, ease: 'easeInOut' } },
  'Slide Up / Slide Out': { initial: { opacity: 0, y: 100 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -100 }, transition: { duration: 0.9, ease: 'easeInOut' } },
  'Slide Down / Slide Out': { initial: { opacity: 0, y: -100 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 100 }, transition: { duration: 0.9, ease: 'easeInOut' } },
  'Slide Left / Slide Right': { initial: { opacity: 0, x: 120 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -120 }, transition: { duration: 0.9, ease: 'easeInOut' } },
  'Slide Right / Slide Left': { initial: { opacity: 0, x: -120 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 120 }, transition: { duration: 0.9, ease: 'easeInOut' } },
  'Zoom In / Zoom Out': { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.15 }, transition: { duration: 0.9, ease: 'easeInOut' } },
  'Zoom Out / Zoom In': { initial: { opacity: 0, scale: 1.15 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.85 }, transition: { duration: 0.9, ease: 'easeInOut' } },
  Flip: { initial: { opacity: 0, rotateY: 180 }, animate: { opacity: 1, rotateY: 0 }, exit: { opacity: 0, rotateY: -180 }, transition: { duration: 1, ease: 'easeInOut' } },
  'Rotate In / Rotate Out': { initial: { opacity: 0, rotate: -30, scale: 0.9 }, animate: { opacity: 1, rotate: 0, scale: 1 }, exit: { opacity: 0, rotate: 30, scale: 0.9 }, transition: { duration: 1, ease: 'easeInOut' } },
  'Pop In / Pop Out': { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.5 }, transition: { duration: 0.7, ease: 'easeOut' } },
};

const transitionKeys = Object.keys(transitions);

const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function SingleHighlightWall({ event, posts }) {
  const rt = useRealtimeChannel();

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

  const [brightness, setBrightness] = useState(event?.background_brightness || 100);

  const [transitionType, setTransitionType] = useState(
    event?.post_transition || 'Fade In / Fade Out'
  );

  const [randomTransition, setRandomTransition] = useState<string | null>(null);

  const [displayDuration, setDisplayDuration] = useState(
    speedMap[event?.transition_speed || 'Medium']
  );

  /* ✅ PATCHED HOOK: uses tick() and currentAd */
  const {
    ads,
    showAd,
    currentAd,
    tick,
    injectorEnabled,
  } = useAdInjector({
    hostId: event?.host_profile_id || event?.host_id || event?.id,
  });

  /* ✅ REALTIME RELOAD + FULLSCREEN PATCH */
  useEffect(() => {
    if (!rt?.current) return;
    if (!event?.id) return;

    const channel = rt.current;

    const handler = (payload: any) => {
      if (payload?.id !== event.id) return;

      if (payload.action === 'reload_wall') {
        window.location.reload();
      }
      if (payload.action === 'fullscreen_wall') {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
      }
    };

    channel.on('broadcast', { event: 'reload_wall' }, handler);
    channel.on('broadcast', { event: 'fullscreen_wall' }, handler);

    return () => {
      channel.off('broadcast', handler);
    };
  }, [rt, event?.id]);

  /* Load posts */
  useEffect(() => {
    if (!event?.id) return;

    const load = async () => {
      const { data } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('fan_wall_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (data) setLivePosts(data);
    };

    load();
  }, [event?.id]);

  /* Poll posts */
  useEffect(() => {
    if (!event?.id) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('fan_wall_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (data) {
        setLivePosts(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [event?.id]);

  /* Realtime for settings */
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
        payload => {
          const w = payload.new;
          if (!w) return;

          if (w.background_value) {
            setBg(
              w.background_type === 'image'
                ? `url(${w.background_value}) center/cover no-repeat`
                : w.background_value
            );
          }

          if (w.background_brightness !== undefined) {
            setBrightness(w.background_brightness);
          }

          if (w.title) setTitle(w.title);
          if (w.logo_url) setLogo(w.logo_url);

          if (w.post_transition) {
            setTransitionType(w.post_transition);
            setRandomTransition(null);
          }

          if (w.transition_speed) {
            const newDur = speedMap[w.transition_speed];
            if (newDur !== displayDuration) setDisplayDuration(newDur);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(wallChannel);
  }, [event?.id, displayDuration]);

  /* ✅ PATCHED ROTATION ENGINE */
  useEffect(() => {
    if (!livePosts.length || showAd) return;

    const rotation = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % livePosts.length);

      if (transitionType === 'Random') {
        const next = transitionKeys[Math.floor(Math.random() * transitionKeys.length)];
        setRandomTransition(next);
      }

      /* ✅ AdInjector tick */
      if (injectorEnabled) {
        tick();
      }
    }, displayDuration);

    return () => clearInterval(rotation);
  }, [
    livePosts.length,
    displayDuration,
    showAd,
    transitionType,
    injectorEnabled,
    tick,
  ]);

  const effectiveTransition =
    transitionType === 'Random'
      ? transitions[randomTransition || 'Fade In / Fade Out']
      : transitions[transitionType] || transitions['Fade In / Fade Out'];

  const current = livePosts[currentIndex % (livePosts.length || 1)];

  return (
    <div
      style={{
        background: bg,
        filter: `brightness(${brightness}%)`,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ✅ Smaller Title Area */}
      <h1
        style={{
          color: '#fff',
          fontSize: 'clamp(2rem,3vw,3.6rem)',
          fontWeight: 900,
          marginTop: '1.4vh',
          marginBottom: '0.6vh',
          textAlign: 'center',
        }}
      >
        {title}
      </h1>

      {/* ✅ Bigger Container */}
      <div
        style={{
          width: '90vw',
          height: '83vh',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          marginTop: '0.5vh',
        }}
      >
        {/* Left photo */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '40px',
            width: '44%',
            height: 'calc(100% - 80px)',
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
                style={{
                  fontSize: '2rem',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                No Photo
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          style={{
            flexGrow: 1,
            marginLeft: '46%',
            paddingTop: '3vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo */}
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
              height: 16,
              marginTop: '2vh',
              marginBottom: '2vh',
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
              fontSize: 'clamp(4rem,2vw,2.4rem)',
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

      {/* ✅ BIGGER QR */}
      <div
        style={{
          position: 'absolute',
          bottom: 25,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontWeight: 700,
            marginBottom: -1,
            fontSize: 'clamp(1rem,1.4vw,1.4rem)',
          }}
        >
          Scan Me To Join
        </p>

        <div
          style={{
            padding: 8,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.08)',
            boxShadow:
              '0 0 25px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.3)',
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            style={{ borderRadius: 12 }}
          />
        </div>
      </div>

      {/* ✅ PATCHED AD OVERLAY CALL */}
      <AdOverlay
        showAd={showAd && injectorEnabled}
        currentAd={currentAd}
        onAdEnd={() => {}}
      />

      {/* Fullscreen Button */}
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.25,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
        onClick={() =>
          !document.fullscreenElement
            ? document.documentElement.requestFullscreen().catch(() => {})
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
