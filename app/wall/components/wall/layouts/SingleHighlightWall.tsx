// ✅ FULL SingleHighlightWall WITH QR GLOW + FULLSCREEN + LIVE BG
'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { supabase } from '@/lib/supabaseClient';

/* ---------- TRANSITIONS ---------- */
const transitions = {
  'Fade In / Fade Out': { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.8 }},
  'Slide Up / Slide Out': { initial: { y: 80, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -80, opacity: 0 }, transition: { duration: 0.7 }},
  'Slide Down / Slide Out': { initial: { y: -80, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 80, opacity: 0 }, transition: { duration: 0.7 }},
  'Slide Left / Slide Right': { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -100, opacity: 0 }, transition: { duration: 0.7 }},
  'Zoom In / Zoom Out': { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.8, opacity: 0 }, transition: { duration: 0.6 }},
};

const speedMap = { Slow: 12000, Medium: 8000, Fast: 4000 };

export default function SingleHighlightWall({ event, posts }) {
  const channelRef = useRealtimeChannel();
  const [livePosts, setLivePosts] = useState(posts || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);

  /* ---- WALL STATE ---- */
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

  /* ✅ Populate from props first */
  useEffect(() => {
    if (posts?.length) setLivePosts(posts);
  }, [posts]);

  /* ✅ Load approved posts from DB */
  useEffect(() => {
    if (!event?.id) return;
    supabase.from('guest_posts')
      .select('*')
      .eq('fan_wall_id', event.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setLivePosts(data));
  }, [event?.id]);

  /* ✅ LIVE updates via broadcast */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !event?.id) return;

    channel.on('broadcast', {}, ({ event: evt, payload: data }) => {
      if (!data?.id || data.id !== event.id) return;

      if (evt === 'wall_updated') {
        setTitle(data.title || title);
        setLogo(data.logo_url || logo);
        if (data.background_value) {
          setBg(data.background_type === 'image'
            ? `url(${data.background_value}) center/cover no-repeat`
            : data.background_value
          );
        }
        if (data.transition_speed) setDisplayDuration(speedMap[data.transition_speed]);
        if (data.post_transition) setTransitionType(data.post_transition);
      }

      if (evt === 'post_added' && data.status === 'approved') {
        setLivePosts(prev => (prev.some(p => p.id === data.id) ? prev : [data, ...prev]));
      }
    });

    return () => channel.unsubscribe?.();
  }, [channelRef, event?.id]);

  /* ✅ DIRECT DB Subscriber — ensures background reacts immediately */
  useEffect(() => {
    if (!event?.id) return;
    const sub = supabase.channel(`wall_updates_${event.id}`)
      .on('postgres_changes', {
        schema: 'public', table: 'fan_walls', event: 'UPDATE', filter: `id=eq.${event.id}`
      }, ({ new: w }) => {
        if (!w) return;
        if (w.background_value) {
          setBg(
            w.background_type === 'image'
              ? `url(${w.background_value}) center/cover no-repeat`
              : w.background_value
          );
        }
        if (w.title) setTitle(w.title);
        if (w.logo_url) setLogo(w.logo_url);
        if (w.transition_speed) setDisplayDuration(speedMap[w.transition_speed]);
        if (w.post_transition) setTransitionType(w.post_transition);
      })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [event?.id]);

  /* ✅ Rotate Posts */
  useEffect(() => {
    if (!livePosts?.length) return;
    const interval = setInterval(() =>
      setCurrentIndex(i => (i + 1) % livePosts.length),
      displayDuration
    );
    return () => clearInterval(interval);
  }, [livePosts, displayDuration]);

  const current = livePosts[currentIndex % (livePosts.length || 1)];
  const transitionStyle = transitions[transitionType];

  /* ✅ Fullscreen */
  const handleFullscreen = () => {
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <div style={{
      background: bg,
      width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflow: 'hidden', position: 'relative',
      opacity: fading ? 0.4 : 1,
      transition: 'opacity .8s, background .6s'
    }}>

      {/* Title */}
      <h1 style={{
        color: '#fff', fontSize: 'clamp(2.5rem,4vw,5rem)', fontWeight: 900,
        marginTop: '3vh', textShadow: '0 0 20px rgba(0,0,0,0.6)'
      }}>
        {title}
      </h1>

      {/* Content Box */}
      <div style={{
        width: '90vw', height: '78vh', backdropFilter: 'blur(20px)',
        background: 'rgba(255,255,255,0.08)', borderRadius: 24,
        boxShadow: '0 0 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
        position: 'relative', display: 'flex', overflow: 'hidden',
      }}>
        
        {/* LEFT Image */}
        <div style={{
          position: 'absolute', top: 40, left: 40, width: '42%', height: 'calc(100% - 80px)',
          overflow: 'hidden', borderRadius: 18, display: 'flex', justifyContent: 'center'
        }}>
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

        {/* RIGHT Text */}
        <div style={{ marginLeft: '44%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3vh' }}>
          <img src={logo} style={{ width: 'clamp(280px, 30vw, 420px)', filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.85))' }} />
          <div style={{ width: '90%', height: 16, borderRadius: 6, background: 'linear-gradient(to right,#000,#444)' }} />
          <p style={{ fontWeight: 700, fontSize: 'clamp(1.6rem,2.5vw,3rem)', color: '#fff', textShadow: '0 0 8px rgba(0,0,0,0.6)' }}>
            {current?.message || 'Be the first to post!'}
          </p>
        </div>
      </div>

      {/* ✅ SCAN TEXT + GLOW QR */}
      <div style={{
        position: 'absolute', bottom: 5, left: 5, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <p style={{
          color: '#fff', fontWeight: 700, fontSize: 'clamp(.9rem,1.4vw,1.4rem)',
          textShadow: '0 0 12px rgba(255,255,255,.8), 0 0 20px rgba(100,180,255,.6)', marginBottom: 6
        }}>
          Scan Me To Join
        </p>

        <div style={{
          padding: 6, borderRadius: 14,
          background: 'rgba(255,255,255,0.05)',
          boxShadow: '0 0 25px rgba(255,255,255,.6),0 0 40px rgba(100,180,255,.3), inset 0 0 10px rgba(0,0,0,.4)'
        }}>
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
            size={140}
            bgColor="#fff"
            fgColor="#000"
            level="H"
          />
        </div>
      </div>

      {/* ✅ Fullscreen Button */}
      <button
        onClick={handleFullscreen}
        style={{
          position: 'absolute', bottom: '2vh', right: '2vw',
          width: 45, height: 45, borderRadius: 8,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', fontSize: '1.2rem', opacity: 0.1, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .35s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.boxShadow = '0 0 14px rgba(255,255,255,.7)';
          e.currentTarget.style.background = 'rgba(255,255,255,.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.1';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'rgba(255,255,255,.05)';
        }}
      >
        ⛶
      </button>
    </div>
  );
}
