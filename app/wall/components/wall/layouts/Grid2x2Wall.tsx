'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { useAdInjector } from '@/hooks/useAdInjector';
import AdOverlay from '@/app/wall/components/AdOverlay';
import { cn } from "../../../../../lib/utils";

interface Grid2x2WallProps {
  event: any;
  posts: any[];
}

/* ---------- SPEED MAP ---------- */
const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function Grid2x2Wall({ event, posts }: Grid2x2WallProps) {
  const rt = useRealtimeChannel();

  /* ---------- STATE ---------- */
  const [livePosts, setLivePosts] = useState(posts || []);
  const [gridPosts, setGridPosts] = useState<(any | null)[]>(Array(4).fill(null));

  const [displayDuration, setDisplayDuration] = useState(
    speedMap[event?.transition_speed || 'Medium']
  );

  /* ✅ BRIGHTNESS */
  const [brightness, setBrightness] = useState(
    event?.background_brightness || 100
  );

  const [bg, setBg] = useState(
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );

  const [title, setTitle] = useState(event?.title || 'Fan Zone Wall');
  const [logo, setLogo] = useState(event?.logo_url || '/faninteractlogo.png');

  const postPointer = useRef(0);
  const cellPointer = useRef(0);
  const rotationTimer = useRef<NodeJS.Timeout | null>(null);

  /* ---------- AD INJECTOR ---------- */
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

  /* ---------- FULLSCREEN FIX ---------- */
  const wasFS = useRef(false);
  useEffect(() => {
    const handler = () => {
      wasFS.current = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const restoreFullscreen = () => {
    if (wasFS.current && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  /* ---------- INITIAL POSTS ---------- */
  useEffect(() => {
    if (!posts?.length) return;

    setLivePosts(posts);

    const initial = posts.slice(0, 4);
    setGridPosts(initial.concat(Array(4 - initial.length).fill(null)));

    postPointer.current = 4 % posts.length;
    cellPointer.current = 0;
  }, [posts]);

  /* ---------- POLLING POSTS (NO REALTIME) ---------- */
  useEffect(() => {
    if (!event?.id) return;

    const poll = async () => {
      const { data } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('fan_wall_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!data) return;

      setLivePosts((prev) => {
        const changed =
          prev.length !== data.length ||
          prev.some((p, i) => p?.id !== data[i]?.id);

        return changed ? data : prev;
      });
    };

    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [event?.id]);

  /* ---------- REALTIME FOR SETTINGS ONLY ---------- */
  useEffect(() => {
    if (!event?.id) return;

    const settingsChannel = supabase
      .channel(`grid2x2_settings_${event.id}`)
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

          /* ✅ Background */
          if (w.background_value) {
            setBg(
              w.background_type === 'image'
                ? `url(${w.background_value}) center/cover no-repeat`
                : w.background_value
            );
          }

          /* ✅ NEW: Brightness */
          if (w.background_brightness !== undefined) {
            setBrightness(w.background_brightness);
          }

          if (w.title) setTitle(w.title);
          if (w.logo_url) setLogo(w.logo_url);

          if (w.transition_speed)
            setDisplayDuration(speedMap[w.transition_speed]);

          restoreFullscreen();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(settingsChannel);
  }, [event?.id]);

  /* ---------- ROTATION ENGINE ---------- */
  useEffect(() => {
    if (!livePosts.length) return;

    if (rotationTimer.current) clearInterval(rotationTimer.current);

    const cycle = () => {
      const next = livePosts[postPointer.current % livePosts.length];
      const cell = cellPointer.current % 4;

      setGridPosts((prev) => {
        const updated = [...prev];
        updated[cell] = next;
        return updated;
      });

      postPointer.current = (postPointer.current + 1) % livePosts.length;
      cellPointer.current = (cellPointer.current + 1) % 4;

      if (cellPointer.current === 0) {
        handlePostRotationTick?.();
      }
    };

    rotationTimer.current = setInterval(cycle, displayDuration);

    return () => clearInterval(rotationTimer.current as NodeJS.Timeout);
  }, [livePosts, displayDuration]);

  /* ---------- TRANSITION ---------- */
  const fadeVariants = {
    enter: { opacity: 0, scale: 0.98 },
    center: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1.1, ease: 'easeInOut' },
    },
    exit: {
      opacity: 0,
      scale: 1.02,
      transition: { duration: 1.1, ease: 'easeInOut' },
    },
  };

  /* ---------- POST CARD ---------- */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div className={cn('flex items-center justify-center text-white text-lg opacity-60')}>
          Fan posts will appear here soon!
        </div>
      );

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div style={{ flex: 1, padding: 2 }}>
          {post.photo_url ? (
            <img
              src={post.photo_url}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 10,
                opacity: 0.9,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}
            >
              No photo
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div
            style={{
              flex: 1,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <h3
              style={{
                color: '#fff',
                fontWeight: 800,
                fontSize: 'clamp(1.6rem, 2.2vw, 2.4rem)',
                margin: 0,
              }}
            >
              {post.nickname}
            </h3>
          </div>

          <div
            style={{
              flex: 1,
              padding: '0 18px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p
              style={{
                color: '#ddd',
                fontSize: 'clamp(1.1rem, 1.6vw, 1.8rem)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {post.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- RENDER ---------- */
  return (
    <div
      style={{
        background: bg,
        filter: `brightness(${brightness}%)`,   // ✅ NEW
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Logo */}
      <div
        style={{
          position: 'absolute',
          top: '3vh',
          right: '3vw',
          width: 'clamp(160px,18vw,220px)',
          zIndex: 20,
        }}
      >
        <img
          src={logo}
          style={{
            width: '100%',
            filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.85))',
          }}
        />
      </div>

      {/* Title */}
      <h1
        style={{
          color: '#fff',
          fontWeight: 900,
          marginTop: '3vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
        }}
      >
        {title}
      </h1>

      {/* Grid */}
      <div
        style={{
          width: '80vw',
          height: '70vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(2,1fr)',
          gridTemplateRows: 'repeat(2,1fr)',
          gap: 0,
          borderRadius: 20,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {gridPosts.map((post, i) => (
          <AnimatePresence key={i} mode="wait">
            <motion.div
              key={(post?.id || 'empty') + '-' + i}
              variants={fadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ width: '100%', height: '100%' }}
            >
              <PostCard post={post} />
            </motion.div>
          </AnimatePresence>
        ))}
      </div>

      {/* QR */}
      <div
        style={{
          position: 'absolute',
          bottom: '4vh',
          left: '4vw',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#fff', fontWeight: 700 }}>Scan Me To Join</p>

        <div
          style={{
            padding: 8,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            boxShadow:
              '0 0 25px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.3)',
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
            size={140}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            style={{ borderRadius: 10 }}
          />
        </div>
      </div>

      {/* Fullscreen */}
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
          zIndex: 9999,
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>

      {/* ADS */}
      <AdOverlay
        showAd={showAd && injectorEnabled}
        ads={ads}
        currentAdIndex={currentAdIndex}
        onAdEnd={() => setShowAd(false)}
      />
    </div>
  );
}
