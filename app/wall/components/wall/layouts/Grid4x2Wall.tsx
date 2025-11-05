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

  useEffect(() => {
    const newDelay = speedMap[event?.transition_speed || 'Medium'];
    setDisplayDelay(newDelay);
    resetKey.current += 1;
  }, [event?.transition_speed]);

  /* LISTEN FOR LIVE UPDATES */
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
      try { channel.unsubscribe?.(); } catch {}
    };
  }, [channelRef, event?.id]);

  /* INITIAL GRID POPULATION */
  useEffect(() => {
    if (!posts?.length) return;
    setGridPosts((prev) => prev.map((_, i) => posts[i % posts.length] || null));
    postPointer.current = 8 % posts.length;
  }, [posts, resetKey.current]);

  /* GRID FADE-CYCLE LOGIC */
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

    async function fade(id: string, to: number) {
      const el = document.getElementById(id);
      if (!el) return;
      await el.animate([{ opacity: to ? 0 : 1 }, { opacity: to ? 1 : 0 }], {
        duration: fadeDuration,
        easing: 'ease-in-out',
      }).finished;
      el.style.opacity = String(to);
    }

    async function runCycle() {
      while (activeRef.current && !cancelled) {
        const [top, bottom] = pairs[pairIndex.current];
        const nextPost = posts[postPointer.current % posts.length];

        await fade(`cell-${bottom}`, 0);
        await new Promise((r) => setTimeout(r, 250));
        await fade(`cell-${top}`, 0);

        setGridPosts((prev) => {
          const updated = [...prev];
          updated[bottom] = prev[top];
          return updated;
        });
        await fade(`cell-${bottom}`, 1);

        setGridPosts((prev) => {
          const updated = [...prev];
          updated[top] = nextPost;
          return updated;
        });
        await fade(`cell-${top}`, 1);

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

  /* Prevent exiting fullscreen accidentally */
  useEffect(() => {
    let wasFullscreen = !!document.fullscreenElement;
    const onChange = () => {
      if (!document.fullscreenElement && wasFullscreen) {
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 300);
      }
      wasFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div className={cn('flex','items-center','justify-center','text-white','text-lg','opacity-60')}>
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
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.2rem',
              marginBottom: 4,
              textShadow: '0 0 6px rgba(0,0,0,0.8)',
              maxWidth: '90%',
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
              lineHeight: 1.3,
              margin: 0,
              maxWidth: '90%',
              wordWrap: 'break-word',
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

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
      }}
    >
      {/* Logo */}
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

      {/* Title */}
      <h1
        style={{
          color: '#fff',
          fontWeight: 900,
          marginTop: '3vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem, 4vw, 5rem)',
          textAlign: 'center',
        }}
      >
        {title}
      </h1>

      {/* Grid */}
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
          backdropFilter: 'blur(14px)',
        }}
      >
        {gridPosts.map((p, i) => (
          <div id={`cell-${i}`} key={i} style={{ width: '100%', height: '100%' }}>
            <PostCard post={p} />
          </div>
        ))}
      </div>

      {/* ✅ UPDATED QR CODE */}
      <div
        style={{
          position: 'absolute',
          bottom: '2vh',
          left: '2vw',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontWeight: 700,
            marginBottom: '0.4vh',
            fontSize: 'clamp(0.9rem, 1.3vw, 1.4rem)',
          }}
        >
          Scan Me To Join
        </p>

        <QRCodeCanvas
          value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
          size={100}
          bgColor="#fff"
          fgColor="#000"
          level="H"
          style={{
            borderRadius: 10,
            boxShadow: '0 0 20px rgba(255,255,255,0.5)',
          }}
        />
      </div>

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
          opacity: 0.25,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen();
          else document.exitFullscreen();
        }}
      >
        ⛶
      </div>
    </div>
  );
}
