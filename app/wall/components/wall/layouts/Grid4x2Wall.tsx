'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { useAdInjector } from '@/hooks/useAdInjector';
import AdOverlay from '@/app/wall/components/AdOverlay';
import { cn } from "../../../../../lib/utils";

/* -------------------------------------------------- */
/* SPEED MAP                                           */
/* -------------------------------------------------- */
const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

interface Grid4x2WallProps {
  event: any;
  posts: any[];
}

export default function Grid4x2Wall({ event, posts }: Grid4x2WallProps) {
  const rt = useRealtimeChannel();

  /* -------------------------------------------------- */
  /* LOCAL STATE                                         */
  /* -------------------------------------------------- */
  const [gridPosts, setGridPosts] = useState<(any | null)[]>(Array(8).fill(null));
  const [displayDelay, setDisplayDelay] = useState(speedMap[event?.transition_speed || 'Medium']);

  const [bg, setBg] = useState(
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );

  const [brightness, setBrightness] = useState(event?.background_brightness || 100);
  const [title, setTitle] = useState(event?.title || 'Fan Zone Wall');
  const [logo, setLogo] = useState(event?.logo_url || '/faninteractlogo.png');

  /* ✅ Manual QR Position Controls */
  const [qrPosition, setQrPosition] = useState({ bottom: 0, left: 0 });
  const [labelOffset, setLabelOffset] = useState({ x: 0, y: 0 });

  const resetKey = useRef(0);
  const postPointer = useRef(0);
  const pairIndex = useRef(0);
  const activeRef = useRef(false);
  const fadeDuration = 1200;

  /* -------------------------------------------------- */
  /* ✅ AD INJECTOR                                       */
  /* -------------------------------------------------- */
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

  /* -------------------------------------------------- */
  /* FULLSCREEN REMEMBER                                 */
  /* -------------------------------------------------- */
  useEffect(() => {
    let wasFS = !!document.fullscreenElement;
    const handler = () => {
      if (!document.fullscreenElement && wasFS) {
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 300);
      }
      wasFS = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* -------------------------------------------------- */
  /* ✅ WALL COMMAND LISTENER (reload only)              */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!event?.id) return;

    const cmdChannel = supabase
      .channel(`wall_commands_${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wall_commands',
          filter: `wall_id=eq.${event.id}`,
        },
        (payload) => {
          const action = payload.new.action;
          if (action === 'reload_wall') {
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(cmdChannel);
  }, [event?.id]);

  /* -------------------------------------------------- */
  /* ✅ REALTIME WALL SETTINGS ONLY                      */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!event?.id) return;

    const settingsChannel = supabase
      .channel(`wall_settings_${event.id}`)
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

          if (w.background_value) {
            setBg(
              w.background_type === 'image'
                ? `url(${w.background_value}) center/cover no-repeat`
                : w.background_value
            );
          }

          if (w.background_brightness !== undefined) setBrightness(w.background_brightness);
          if (w.title) setTitle(w.title);
          if (w.logo_url) setLogo(w.logo_url);

          if (w.transition_speed) {
            const newDelay = speedMap[w.transition_speed] || speedMap.Medium;
            setDisplayDelay(newDelay);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(settingsChannel);
  }, [event?.id]);

  /* -------------------------------------------------- */
  /* ✅ POLLING POSTS                                    */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!event?.id) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('fan_wall_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!data) return;

      setGridPosts(prev => {
        let updated = [...prev];
        for (let i = 0; i < 8; i++) {
          updated[i] = data[i] || null;
        }
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [event?.id]);

  /* -------------------------------------------------- */
  /* INITIAL FILL                                        */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!posts?.length) return;

    setGridPosts(
      Array.from({ length: 8 }, (_, i) => posts[i % posts.length] || null)
    );

    postPointer.current = 8 % posts.length;
  }, [posts]);

  /* -------------------------------------------------- */
  /* ✅ GRID ROTATION WITH FIXED INJECTOR TICK           */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!posts?.length) return;

    const pairs: [number, number][] = [
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    let cancelled = false;
    activeRef.current = true;

    const fade = async (id: string, to: number) => {
      const el = document.getElementById(id);
      if (!el) return;

      await el.animate(
        [{ opacity: to ? 0 : 1 }, { opacity: to ? 1 : 0 }],
        { duration: fadeDuration, easing: 'ease-in-out' }
      ).finished;

      el.style.opacity = String(to);
    };

    async function run() {
      while (activeRef.current && !cancelled) {
        const [top, bottom] = pairs[pairIndex.current];
        const next = posts[postPointer.current % posts.length];

        await fade(`cell-${bottom}`, 0);
        await new Promise(r => setTimeout(r, 250));
        await fade(`cell-${top}`, 0);

        setGridPosts(prev => {
          const u = [...prev];
          u[bottom] = prev[top];
          return u;
        });
        await fade(`cell-${bottom}`, 1);

        setGridPosts(prev => {
          const u = [...prev];
          u[top] = next;
          return u;
        });
        await fade(`cell-${top}`, 1);

        postPointer.current = (postPointer.current + 1) % posts.length;
        pairIndex.current = (pairIndex.current + 1) % pairs.length;

        /* ✅ Injector tick EVERY rotation */
        handlePostRotationTick?.();

        await new Promise(r => setTimeout(r, displayDelay));
      }
    }

    run();
    return () => {
      cancelled = true;
      activeRef.current = false;
    };
  }, [posts, displayDelay]);

  /* -------------------------------------------------- */
  /* CELL COMPONENT                                      */
  /* -------------------------------------------------- */
  function PostCard({ post }: { post: any }) {
    if (!post) {
      return (
        <div className={cn('flex items-center justify-center text-white text-lg opacity-60')}>
          Fan posts will appear here soon!
        </div>
      );
    }

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 14,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ height: '70%', padding: 2 }}>
          <img
            src={post.photo_url}
            alt="Guest submission"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 12,
            }}
          />
        </div>

        <div
          style={{
            height: '30%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.2rem',
              marginBottom: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#ddd',
              fontSize: '1rem',
              maxWidth: '90%',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* RENDER                                              */
  /* -------------------------------------------------- */
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
        justifyContent: 'flex-start',
        overflow: 'hidden',
        position: 'relative',
        marginTop: '-3vh',
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
            height: 'auto',
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
          textAlign: 'center',
        }}
      >
        {title}
      </h1>

      {/* Grid */}
      <div
        style={{
          width: '88vw',
          height: '82vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 10,
          borderRadius: 20,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {gridPosts.map((p, i) => (
          <div id={`cell-${i}`} key={i} style={{ width: '100%', height: '100%' }}>
            <PostCard post={p} />
          </div>
        ))}
      </div>

      {/* ✅ Adjustable QR + Label */}
      <div
        style={{
          position: 'absolute',
          bottom: `${qrPosition.bottom}vh`,
          left: `${qrPosition.left}vw`,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontWeight: 700,
            marginBottom: `${0.4 + labelOffset.y}vh`,
            fontSize: 'clamp(0.9rem,1.3vw,1.4rem)',
            transform: `translateX(${labelOffset.x}vw)`
          }}
        >
          Scan Me To Join
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            boxShadow:
              '0 0 18px rgba(255,255,255,0.5), 0 0 28px rgba(100,180,255,0.25), inset 0 0 6px rgba(0,0,0,0.35)',
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            style={{ borderRadius: 10 }}
          />
        </div>

        {/* 🔧 Temporary adjustment buttons */}
        <div style={{ marginTop: 8, display: 'flex', gap: 4, justifyContent: 'center' }}>
          <button onClick={() => setQrPosition(p => ({ ...p, left: p.left - 1 }))}>←</button>
          <button onClick={() => setQrPosition(p => ({ ...p, left: p.left + 1 }))}>→</button>
          <button onClick={() => setQrPosition(p => ({ ...p, bottom: p.bottom + 1 }))}>↑</button>
          <button onClick={() => setQrPosition(p => ({ ...p, bottom: p.bottom - 1 }))}>↓</button>
        </div>
      </div>

      {/* Fullscreen */}
      <div
        style={{
          position: 'fixed',
          bottom: 2,
          right: 40,
          width: 48,
          height: 48,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.25,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
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

      {/* Ads */}
      <AdOverlay
        showAd={showAd && injectorEnabled}
        ads={ads}
        currentAdIndex={currentAdIndex}
        onAdEnd={() => setShowAd(false)}
      />
    </div>
  );
}
