'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { supabase } from '@/lib/supabaseClient';

/* ---------- TRANSITION STYLES ---------- */
const transitions: Record<string, any> = {
  'Fade In / Fade Out': { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.8 } },
  'Slide Up / Slide Out': { initial: { y: 80, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -80, opacity: 0 }, transition: { duration: 0.7 } },
  'Slide Down / Slide Out': { initial: { y: -80, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 80, opacity: 0 }, transition: { duration: 0.7 } },
  'Slide Left / Slide Right': { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -100, opacity: 0 }, transition: { duration: 0.7 } },
  'Zoom In / Zoom Out': { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.8, opacity: 0 }, transition: { duration: 0.6 } },
};

const speedMap: Record<string, number> = { Slow: 12000, Medium: 8000, Fast: 4000 };

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
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );

  const [transitionType, setTransitionType] = useState(event?.post_transition || 'Fade In / Fade Out');
  const [displayDuration, setDisplayDuration] = useState(speedMap[event?.transition_speed || 'Medium']);
  const transitionLock = useRef(false);

  /* ✅ fullscreen memory */
  const wasFullscreen = useRef(false);

  function ensureFullscreen() {
    if (wasFullscreen.current && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  /* 👉 track whenever fullscreen changes */
  useEffect(() => {
    const handler = () => {
      wasFullscreen.current = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* === ✅ INITIAL FETCH === */
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

  useEffect(() => { loadPosts(); }, [event?.id]);

  /* === ✅ REALTIME POSTS === */
  useEffect(() => {
    if (!event?.id) return;

    const postsChannel = supabase
      .channel(`wall_posts_${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_posts', filter: `fan_wall_id=eq.${event.id}` },
        async (payload) => {
          const row = payload.new;

          if (payload.eventType === 'INSERT' && row?.status === 'approved') {
            setLivePosts(prev => prev.some(p => p.id === row.id) ? prev : [row, ...prev]);
            ensureFullscreen(); // ✅ keep fullscreen
          }

          if (payload.eventType === 'UPDATE') {
            await loadPosts();
            ensureFullscreen(); // ✅ keep fullscreen
          }

          if (payload.eventType === 'DELETE') {
            setLivePosts(prev => prev.filter(p => p.id !== payload.old.id));
            ensureFullscreen(); // ✅ keep fullscreen
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(postsChannel);
  }, [event?.id]);

  /* === ✅ REALTIME SETTINGS === */
  useEffect(() => {
    if (!event?.id) return;

    const settingsChannel = supabase
      .channel(`wall_settings_${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fan_walls', filter: `id=eq.${event.id}` },
        (payload) => {
          const w = payload.new;
          if (!w) return;

          if (w.background_value) {
            setBg(w.background_type === 'image'
              ? `url(${w.background_value}) center/cover no-repeat`
              : w.background_value
            );
          }
          if (w.title) setTitle(w.title);
          if (w.logo_url) setLogo(w.logo_url);
          if (w.transition_speed) setDisplayDuration(speedMap[w.transition_speed]);
          if (w.post_transition) setTransitionType(w.post_transition);

          ensureFullscreen(); // ✅ keep fullscreen when style updates
        }
      )
      .subscribe();

    return () => supabase.removeChannel(settingsChannel);
  }, [event?.id]);

  /* === ✅ ROTATION === */
  useEffect(() => {
    if (!livePosts.length) return;
    const interval = setInterval(() => setCurrentIndex(i => (i + 1) % livePosts.length), displayDuration);
    return () => clearInterval(interval);
  }, [livePosts, displayDuration]);

  const transitionStyle = transitions[transitionType] || transitions['Fade In / Fade Out'];
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
              <motion.img key={current.id} src={current.photo_url} {...transitionStyle}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
            ) : (
              <motion.div key="no-photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: '2rem' }}>
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
            <img src={logo} alt="Logo"
              style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.85))' }} />
          </div>

          {/* GREY BAR */}
          <div style={{
            width: '90%',
            height: 16,
            borderRadius: 6,
            background: 'linear-gradient(to right,#000,#444)',
            boxShadow: '0 0 14px rgba(0,0,0,0.7)',
            opacity: 0.9,
            marginTop: '1vh',
            marginBottom: '2vh'
          }}/>

          {/* MESSAGE */}
          <p style={{
            fontWeight: 700, margin: 0,
            fontSize: 'clamp(1.6rem, 2.5vw, 3rem)',
            textAlign: 'center',
            color: '#fff',
            textShadow: '0 0 8px rgba(0,0,0,0.6)',
          }}>
            {current?.message || 'Be the first to post!'}
          </p>
        </div>
      </div>

      {/* ✅ QR + TEXT */}
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
        <p style={{
          color: '#fff',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 'clamp(0.9rem, 1.4vw, 1.4rem)',
          marginBottom: '6px',
          textShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 20px rgba(100,180,255,0.6)',
        }}>
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

      {/* ✅ FULLSCREEN BUTTON */}
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

