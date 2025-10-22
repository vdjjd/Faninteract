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
  const [columns, setColumns] = useState<any[][]>([[], [], [], []]);
  const [postIndex, setPostIndex] = useState(0);
  const [activeColumn, setActiveColumn] = useState(0);

  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const repeated = [...posts];
    while (repeated.length < 8) repeated.push(...posts);
    const filledCols = [[], [], [], []].map((_, i) =>
      repeated.slice(i * 2, i * 2 + 2)
    );
    setColumns(filledCols);
    setPostIndex(repeated.length % posts.length);
  }, [posts]);

  /* ---------- SLOT-MACHINE SEQUENTIAL UPDATES ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    const updateColumn = (colIndex: number) => {
      const nextPost = posts[postIndex % posts.length];
      setPostIndex((prev) => (prev + 1) % posts.length);

      setColumns((prevCols) => {
        const updated = [...prevCols];
        const col = [...updated[colIndex]];
        col.unshift(nextPost);
        if (col.length > 2) col.pop();
        updated[colIndex] = col;
        return updated;
      });
    };

    const timer = setInterval(() => {
      updateColumn(activeColumn);
      setActiveColumn((prev) => (prev + 1) % 4);
    }, displayDuration);

    return () => clearInterval(timer);
  }, [posts, activeColumn, displayDuration, postIndex]);

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

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
      {/* LEFT: PHOTO (larger) */}
      <div
        style={{
          flex: '0 0 48%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: '14px',
        }}
      >
        {post.photo_url ? (
          <img
            src={post.photo_url}
            alt="Guest submission"
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              objectFit: 'cover',
              borderRadius: 12,
              boxShadow: '0 0 16px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
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

      {/* RIGHT: NAME + MESSAGE (no dark box) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '10px',
          paddingLeft: '6px',
        }}
      >
        {/* NAME */}
        <h3
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.3rem',
            textAlign: 'center',
            margin: 0,
            textShadow: '0 0 10px rgba(0,0,0,0.6)',
          }}
        >
          {post.nickname || ''}
        </h3>

        {/* MESSAGE */}
        <p
          style={{
            color: '#f1f1f1',
            fontSize: '1.1rem',
            fontWeight: 400,
            lineHeight: 1.4,
            textAlign: 'center',
            margin: 0,
            textShadow: '0 0 6px rgba(0,0,0,0.5)',
          }}
        >
          {post.message || ''}
        </p>
      </div>
    </div>
  );
}


  /* ---------- SMOOTH SLIDE ---------- */
  const slideVariants = {
    hidden: { y: '-100%', opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.9, ease: 'easeOut' },
    },
    exit: {
      y: '100%',
      opacity: 0,
      transition: { duration: 0.9, ease: 'easeIn' },
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
      {/* ---------- LOGO ---------- */}
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

      {/* ---------- TITLE ---------- */}
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
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* ---------- GRID ---------- */}
      <div
        style={{
          width: '90vw',
          height: '70vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 0,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {columns.flat().map((post, i) => (
          <AnimatePresence key={i} mode="popLayout">
            <motion.div
              key={(post?.id || 'empty') + '-' + i}
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ width: '100%', height: '100%' }}
            >
              <PostCard post={post} />
            </motion.div>
          </AnimatePresence>
        ))}
      </div>

      {/* ---------- QR ---------- */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(17vh - 90px)',
          left: 'calc(9vw - 90px)',
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
            textShadow: '0 0 10px rgba(0,0,0,0.6)',
            fontWeight: 700,
            fontSize: 'clamp(1.2rem, 1.8vw, 2rem)',
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

      {/* ---------- FULLSCREEN ---------- */}
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
          transition: 'opacity 0.3s ease',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="white"
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

