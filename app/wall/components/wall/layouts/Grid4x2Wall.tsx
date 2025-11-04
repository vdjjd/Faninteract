'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { cn } from "../../../../../lib/utils";

interface Grid4x2WallProps {
  event: any;
  posts: any[];
}

/* ---------- SPEED MAP ---------- */
const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

/* -------------------------------------------------------------------------- */
/* 🧱 4x2 Grid Layout — Realtime Optimized                                    */
/* -------------------------------------------------------------------------- */
export default function Grid4x2Wall({ event, posts }: Grid4x2WallProps) {
  const channelRef = useRealtimeChannel();
  const [gridPosts, setGridPosts] = useState<(any | null)[]>(Array(8).fill(null));
  const [displayDelay, setDisplayDelay] = useState(speedMap[event?.transition_speed || 'Medium']);
  const [bg, setBg] = useState(
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );
  const [title, setTitle] = useState(event?.title || 'Fan Zone Wall');
  const [logo, setLogo] = useState(event?.logo_url || '/faninteractlogo.png');

  const resetKey = useRef(0);
  const postPointer = useRef(0);
  const pairIndex = useRef(0);
  const activeRef = useRef(false);

  const fadeDuration = 1200;

  /* ---------- UPDATE SPEED LIVE ---------- */
  useEffect(() => {
    const newDelay = speedMap[event?.transition_speed || 'Medium'];
    setDisplayDelay(newDelay);
    resetKey.current += 1;
  }, [event?.transition_speed]);

  /* ---------- BACKGROUND + TITLE LIVE ---------- */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !event?.id) return;

    const handleBroadcast = (payload: any) => {
      const { event: evt, payload: data } = payload;
      if (!data?.id || data.id !== event.id) return;

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
        if (data.transition_speed) setDisplayDelay(speedMap[data.transition_speed]);
      }

      if (evt === 'post_added') {
        const newPost = data;
        setGridPosts((prev) => {
          if (prev.some((p) => p?.id === newPost.id)) return prev;
          const next = [...prev];
          next[postPointer.current % 8] = newPost;
          return next;
        });
      }
    };

    channel.on('broadcast', {}, handleBroadcast);
    return () => {
      try {
        channel.unsubscribe?.();
      } catch {}
    };
  }, [channelRef, event?.id]);

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    setGridPosts((prev) => prev.map((_, i) => posts[i % posts.length] || null));
    postPointer.current = 8 % posts.length;
  }, [posts, resetKey.current]);

  /* ---------- SEQUENTIAL PAIR LOOP ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    const pairs: [number, number][] = [
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    let cancelled = false;
    activeRef.current = true;

    async function fadeOutCell(index: number) {
      const el = document.getElementById(`cell-${index}`);
      if (!el) return;
      await el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: fadeDuration,
        easing: 'ease-in-out',
      }).finished;
      if (!cancelled) el.style.opacity = '0';
    }

    async function fadeInCell(index: number) {
      const el = document.getElementById(`cell-${index}`);
      if (!el) return;
      await el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: fadeDuration,
        easing: 'ease-in-out',
      }).finished;
      if (!cancelled) el.style.opacity = '1';
    }

    async function runCycle() {
      while (activeRef.current && !cancelled) {
        const [top, bottom] = pairs[pairIndex.current];
        const nextPost = posts[postPointer.current % posts.length];

        await fadeOutCell(bottom);
        await new Promise((r) => setTimeout(r, 300));
        await fadeOutCell(top);

        setGridPosts((prev) => {
          const updated = [...prev];
          updated[bottom] = prev[top];
          return updated;
        });
        await fadeInCell(bottom);

        setGridPosts((prev) => {
          const updated = [...prev];
          updated[top] = nextPost;
          return updated;
        });
        await fadeInCell(top);

        postPointer.current = (postPointer.current + 1) % posts.length;
        pairIndex.current = (pairIndex.current + 1) % pairs.length;

        await new Promise((r) => setTimeout(r, displayDelay));
      }
    }

    runCycle();
    return () => {
      cancelled = true;
      activeRef.current = false;
    };
  }, [posts, displayDelay, resetKey.current]);

  /* ---------- AUTO RESTORE FULLSCREEN ---------- */
  useEffect(() => {
    let wasFullscreen = !!document.fullscreenElement;
    const handleChange = () => {
      if (!document.fullscreenElement && wasFullscreen) {
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 300);
      }
      wasFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  /* ---------- POST CARD ---------- */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div className={cn('flex', 'items-center', 'justify-center', 'text-white', 'text-lg', 'opacity-60')}>
          Fan posts will appear here soon!
        </div>
      );

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
        <div style={{ height: '70%', position: 'relative', padding: 2 }}>
          <img
            src={post.photo_url}
            alt="Guest submission"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 12,
              display: 'block',
              opacity: 0.9,
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
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '0 0 12px 12px',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.2rem',
              marginBottom: 4,
              textShadow: '0 0 6px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '90%',
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#ddd',
              fontSize: '1rem',
              fontWeight: 500,
              lineHeight: 1.3,
              margin: 0,
              maxWidth: '90%',
              textShadow: '0 0 4px rgba(0,0,0,0.6)',
              wordWrap: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

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
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.6s ease',
      }}
    >
      {/* LOGO */}
      <div
        style={{
          position: 'absolute',
          top: '3vh',
          right: '3vw',
          width: 'clamp(160px, 18vw, 220px)',
          zIndex: 20,
        }}
      >
        <img
          src={logo}
          alt="Logo"
          style={{
            width: '100%',
            height: 'auto',
            filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.8))',
          }}
        />
      </div>

      {/* TITLE */}
      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
          fontWeight: 900,
          letterSpacing: '1px',
          marginTop: '3vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem, 4vw, 5rem)',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>

      {/* GRID */}
      <div
        style={{
          width: '88vw',
          height: '70vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 10,
          borderRadius: 20,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(14px) saturate(150%)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow:
            '0 0 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.08)',
        }}
      >
        {gridPosts.map((post, i) => (
          <div id={`cell-${i}`} key={i} style={{ width: '100%', height: '100%' }}>
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {/* QR */}
      <div
        style={{
          position: 'absolute',
          bottom: '2vh',
          left: '2vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: 'clamp(0.9rem, 1.3vw, 1.4rem)',
            marginBottom: '0.4vh',
            textAlign: 'center',
          }}
        >
          Scan Me To Join
        </p>
        <QRCodeCanvas
          value={`https://faninteract.vercel.app/submit/${event.id}`}
          size={100}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          style={{
            borderRadius: 10,
            boxShadow:
              '0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.25), inset 0 0 8px rgba(0,0,0,0.4)',
          }}
        />
      </div>

      {/* FULLSCREEN BUTTON */}
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
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'opacity 0.3s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen().catch(console.error);
          else document.exitFullscreen();
        }}
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: 26, height: 26 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>
    </div>
  );
}
