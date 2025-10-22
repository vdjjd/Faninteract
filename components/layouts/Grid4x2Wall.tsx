'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
  const [columnTurn, setColumnTurn] = useState(0);

  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    const newCols: any[][] = [[], [], [], []];
    // Start empty, but load one post per column to initialize
    for (let i = 0; i < 4; i++) {
      newCols[i] = posts.length > i ? [posts[i]] : [];
    }
    setColumns(newCols);
    setPostIndex(4 % posts.length);
  }, [posts]);

  /* ---------- SEQUENTIAL COLUMN UPDATE ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    const timer = setInterval(() => {
      const nextPost = posts[postIndex % posts.length];
      setPostIndex((prev) => (prev + 1) % posts.length);

      setColumns((prevCols) => {
        const newCols = prevCols.map((c) => [...c]);
        newCols[columnTurn] = [nextPost, ...newCols[columnTurn]].slice(0, 2);
        return newCols;
      });

      setColumnTurn((prev) => (prev + 1) % 4);
    }, displayDuration);

    return () => clearInterval(timer);
  }, [posts, columnTurn, displayDuration, postIndex]);

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* ---------- POST CARD ---------- */
  const PostCard = ({ post }: { post: any }) => {
    if (!post) return <div style={{ flex: 1 }} />;

    return (
      <motion.div
        key={post.id}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {/* LEFT: PHOTO */}
        <div style={{ flex: 1 }}>
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt="Guest"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.9,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.05)',
              }}
            />
          )}
        </div>

        {/* RIGHT: TEXT */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.3rem',
              textAlign: 'center',
              marginTop: '10%',
            }}
          >
            {post.nickname || ''}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              color: '#ddd',
              fontSize: '1rem',
              textAlign: 'center',
              marginBottom: '10%',
              lineHeight: 1.2,
            }}
          >
            {post.message || ''}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  /* ---------- RENDER ---------- */
  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
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
        }}
      >
        {columns.map((col, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            {col.map((post, j) => (
              <PostCard key={`${post?.id || 'empty'}-${i}-${j}`} post={post} />
            ))}
          </div>
        ))}
      </div>

      {/* ---------- QR ---------- */}
      <div
        style={{
          position: 'absolute',
          bottom: '5vh',
          left: '5vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.4rem',
            marginBottom: 8,
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
          opacity: 0.2,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'opacity 0.3s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.2')}
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
