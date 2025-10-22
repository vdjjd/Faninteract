'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';

interface Grid4x2WallProps {
  event: any;
  posts: any[];
}

const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function Grid4x2Wall({ event, posts }: Grid4x2WallProps) {
  const [columns, setColumns] = useState<any[][]>([[], [], [], []]);
  const [postIndex, setPostIndex] = useState(0);

  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;
  const fadeDuration = 2000;
  const pauseBetween = 500;

  // Fill first 8 slots
  useEffect(() => {
    if (!posts?.length) return;
    const repeated = [...posts];
    while (repeated.length < 8) repeated.push(...posts);
    const filled = [[], [], [], []].map((_, i) =>
      repeated.slice(i * 2, i * 2 + 2)
    );
    setColumns(filled);
    setPostIndex(8 % posts.length);
  }, [posts]);

  // Sequential async loop
  useEffect(() => {
    if (!posts?.length) return;

    let cancelled = false;

    async function animateLoop() {
      let activeColumn = 0;

      while (!cancelled) {
        const nextPost = posts[postIndex % posts.length];

        // fade top (ghost)
        setColumns((prev) => {
          const updated = [...prev];
          const col = [...updated[activeColumn]];
          if (col[0]) col[0] = { ...col[0], state: 'ghost' };
          updated[activeColumn] = col;
          return updated;
        });

        await delay(fadeDuration);

        // fade bottom to old top
        setColumns((prev) => {
          const updated = [...prev];
          const col = [...updated[activeColumn]];
          if (col[0]) col[1] = { ...col[0], state: 'ghost' };
          updated[activeColumn] = col;
          return updated;
        });

        await delay(pauseBetween);

        // fade new post into top
        setColumns((prev) => {
          const updated = [...prev];
          const col = [...updated[activeColumn]];
          col[0] = { ...nextPost, state: 'fadein' };
          updated[activeColumn] = col;
          return updated;
        });

        setPostIndex((p) => (p + 1) % posts.length);
        await delay(displayDuration);

        activeColumn = (activeColumn + 1) % 4;
      }
    }

    animateLoop();
    return () => {
      cancelled = true;
    };
  }, [posts]);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  /* ---------- Background ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* ---------- Post Card ---------- */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            opacity: 0.3,
          }}
        >
          Waiting for posts…
        </div>
      );

    let opacity = 1;
    if (post.state === 'ghost') opacity = 0.25;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity:
            post.state === 'fadein'
              ? [0, 1]
              : post.state === 'ghost'
              ? [1, 0.25]
              : 1,
        }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderRadius: 14,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '14px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            flex: '0 0 60%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingRight: '10px',
          }}
        >
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt=""
              style={{
                width: '100%',
                aspectRatio: '1/1',
                objectFit: 'cover',
                borderRadius: 12,
                boxShadow: '0 0 16px rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '1rem',
                borderRadius: 12,
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
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.2rem',
              margin: 0,
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#eee',
              fontSize: '1rem',
              margin: 0,
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </motion.div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Title */}
      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          marginTop: '3vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* Grid */}
      <div
        style={{
          width: '90vw',
          height: '70vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {columns.flat().map((post, i) => (
          <PostCard key={(post?.id || 'empty') + '-' + i} post={post} />
        ))}
      </div>

      {/* QR */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(17vh - 90px)',
          left: 'calc(9vw - 90px)',
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
            fontSize: 'clamp(1.2rem,1.8vw,2rem)',
            marginBottom: '0.8vh',
          }}
        >
          Scan Me To Join
        </p>
        <QRCodeCanvas
          value={`https://faninteract.vercel.app/submit/${event.id}`}
          size={180}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          style={{
            borderRadius: 12,
            boxShadow: '0 0 18px rgba(0,0,0,0.6)',
          }}
        />
      </div>
    </div>
  );
}




