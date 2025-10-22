'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

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
  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const looped = [...posts];
    while (looped.length < 8) looped.push(...posts);

    const newCols: any[][] = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
      newCols[i] = looped.slice(i * 2, i * 2 + 2);
    }
    setColumns(newCols);
    setPostIndex(8 % looped.length);
  }, [posts]);

  /* ---------- WATERFALL LOOP ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    const looped = [...posts];
    while (looped.length < 8) looped.push(...posts);

    let currentColumn = 0;
    let active = true;

    async function runWaterfall() {
      while (active) {
        const nextPost = looped[postIndex % looped.length];
        setPostIndex((prev) => (prev + 1) % looped.length);

        setColumns((prev) => {
          const newCols = [...prev];
          newCols[currentColumn] = [nextPost, ...newCols[currentColumn]].slice(
            0,
            2
          );
          return newCols;
        });

        currentColumn = (currentColumn + 1) % 4;
        await new Promise((r) => setTimeout(r, displayDuration));
      }
    }

    runWaterfall();
    return () => {
      active = false;
    };
  }, [posts, displayDuration, postIndex]);

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* ---------- CARD ANIM ---------- */
  const cardVariants = {
    enter: { y: -100, opacity: 0 },
    center: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
    exit: {
      y: 100,
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeIn' },
    },
  };

  /* ---------- POST CARD ---------- */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div className="flex items-center justify-center text-white text-lg opacity-60">
          Fan posts will appear here soon!
        </div>
      );

    return (
      <motion.div
        variants={cardVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="flex flex-row w-full h-full rounded-xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-md"
      >
        {/* LEFT IMAGE */}
        <div className="flex-1 relative">
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt="Guest submission"
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-white/10 text-gray-300">
              No photo
            </div>
          )}
        </div>

        {/* RIGHT TEXT */}
        <div className="flex-1 flex flex-col justify-between p-3 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeIn' }}
            className="text-white font-bold text-xl text-center mt-2"
          >
            {post.nickname || ''}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeIn', delay: 0.1 }}
            className="text-gray-200 text-center text-base mb-2"
          >
            {post.message || ''}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  /* ---------- RENDER ---------- */
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
          lineHeight: 1.1,
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* ---------- 4×2 GRID ---------- */}
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
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {columns.map((col, colIndex) => (
          <div key={colIndex} className="flex flex-col h-full">
            <AnimatePresence mode="popLayout">
              {col.map((post, i) => (
                <motion.div
                  key={`${post?.id || 'empty'}-${i}`}
                  variants={cardVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{ flex: 1 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
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
          includeMargin={false}
          style={{
            borderRadius: 12,
            boxShadow: '0 0 18px rgba(0,0,0,0.6)',
          }}
        />
      </div>

      {/* ---------- FULLSCREEN BUTTON ---------- */}
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
          transition: 'opacity 0.3s ease',
          opacity: 0.25,
          background: 'rgba(255,255,255,0.1)',
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
