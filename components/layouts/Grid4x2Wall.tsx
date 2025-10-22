'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';

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
  const [gridPosts, setGridPosts] = useState<(any | null)[]>(Array(8).fill(null));
  const [postIndex, setPostIndex] = useState(0);
  const [cellIndex, setCellIndex] = useState(0);

  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;

  const fadeDurations: Record<string, number> = {
    Slow: 1.6,
    Medium: 1.2,
    Fast: 0.8,
  };
  const fadeDuration = fadeDurations[event?.transition_speed || 'Medium'];

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const initial = posts.slice(0, 8);
    setGridPosts(initial.map((p) => p || null));
    setPostIndex(8 % posts.length);
    setCellIndex(0);
  }, [posts]);

  /* ---------- CYCLIC UPDATES ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    const interval = setInterval(() => {
      const next = posts[postIndex % posts.length];
      const cellToUpdate = order[cellIndex % order.length];
      setGridPosts((prev) => {
        const newGrid = [...prev];
        newGrid[cellToUpdate] = next;
        return newGrid;
      });
      setPostIndex((prev) => (prev + 1) % posts.length);
      setCellIndex((prev) => (prev + 1) % order.length);
    }, displayDuration);
    return () => clearInterval(interval);
  }, [posts, cellIndex, postIndex, displayDuration]);

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right, #1b2735, #090a0f)';

  /* ---------- POST CARD ---------- */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div className="flex items-center justify-center text-white text-lg opacity-60">
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
          position: 'relative',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow:
            '0 0 20px rgba(255,255,255,0.1), 0 0 30px rgba(100,180,255,0.15)',
        }}
      >
        {/* LEFT: PHOTO */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '4px',
            boxSizing: 'border-box',
          }}
        >
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt="Guest submission"
              style={{
                width: '100%',
                height: '50%', // ⬅️ reduced vertical height
                objectFit: 'cover',
                display: 'block',
                opacity: 0.9,
                borderRadius: 10,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '1rem',
                borderRadius: 10,
              }}
            >
              No photo
            </div>
          )}
        </div>

        {/* RIGHT: NAME + MESSAGE */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid rgba(255,255,255,0.15)',
            boxShadow: 'inset 0 0 12px rgba(255,255,255,0.08)',
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* NAME */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 18px',
            }}
          >
            <h3
              style={{
                color: '#fff',
                fontWeight: 800,
                fontSize: 'clamp(1.4rem, 1.8vw, 2rem)',
                textShadow:
                  '0 0 12px rgba(255,255,255,0.8), 0 0 20px rgba(100,180,255,0.6), 0 0 4px rgba(0,0,0,0.8)',
                margin: 0,
              }}
            >
              {post.nickname || ''}
            </h3>
          </div>

          {/* MESSAGE */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 18px 12px',
            }}
          >
            <p
              style={{
                color: '#ddd',
                fontSize: 'clamp(1rem, 1.3vw, 1.5rem)',
                fontWeight: 500,
                lineHeight: 1.5,
                textShadow: '0 0 8px rgba(0,0,0,0.6)',
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))',
                margin: 0,
              }}
            >
              {post.message || ''}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- ANIMATION VARIANTS ---------- */
  const fadeVariants = {
    enter: { opacity: 0, scale: 0.98 },
    center: {
      opacity: 1,
      scale: 1,
      transition: { duration: fadeDuration, ease: 'easeInOut' },
    },
    exit: {
      opacity: 0,
      scale: 1.02,
      transition: { duration: fadeDuration, ease: 'easeInOut', delay: 0.4 },
    },
  };

  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
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
          src={event.logo_url || '/faninteractlogo.png'}
          alt="Logo"
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.85))',
          }}
        />
      </div>

      {/* TITLE */}
      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          textShadow:
            '0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(100,180,255,0.6)',
          fontWeight: 900,
          letterSpacing: '1px',
          marginTop: '3vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem, 4vw, 5rem)',
          lineHeight: 1.1,
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* 4×2 GRID */}
      <div
        style={{
          width: '90vw',
          height: '75vh',
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

      {/* QR SECTION */}
      <div
        style={{
          position: 'absolute',
          bottom: '4vh',
          left: '4vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            textAlign: 'center',
            textShadow:
              '0 0 12px rgba(255,255,255,0.8), 0 0 20px rgba(100,180,255,0.6)',
            fontWeight: 700,
            fontSize: 'clamp(1rem, 1.5vw, 1.6rem)',
            marginBottom: '0.6vh',
          }}
        >
          Scan Me To Join
        </p>
        <div
          style={{
            padding: 8,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            boxShadow:
              '0 0 25px rgba(255,255,255,0.6), 0 0 40px rgba(100,180,255,0.3), inset 0 0 10px rgba(0,0,0,0.4)',
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/submit/${event.id}`}
            size={140}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
            style={{
              borderRadius: 10,
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
}














