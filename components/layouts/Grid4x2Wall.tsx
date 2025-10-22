'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';

interface SingleWallProps {
  event: any;
  posts: any[];
}

export default function SingleWall({ event, posts }: SingleWallProps) {
  const [current, setCurrent] = useState<any>(null);
  const [postIndex, setPostIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const fadeDuration = 2000; // 2 sec fade
  const blankDelay = 2000; // 2 sec blank pause
  const holdDuration = 4000; // hold visible 4s before next fade out

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    if (posts && posts.length > 0) setCurrent(posts[0]);
  }, [posts]);

  /* ---------- FADE LOOP ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    const interval = setInterval(() => {
      // fade out
      setFadeKey((prev) => prev + 1);

      // after fade out, blank delay, then fade in new post
      setTimeout(() => {
        const next = posts[(postIndex + 1) % posts.length];
        setPostIndex((prev) => (prev + 1) % posts.length);
        setCurrent(next);
      }, fadeDuration + blankDelay);
    }, fadeDuration * 2 + blankDelay + holdDuration);

    return () => clearInterval(interval);
  }, [posts, postIndex]);

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
        <div
          className="flex items-center justify-center text-white text-xl opacity-60"
          style={{ height: '100%', width: '100%' }}
        >
          Waiting for posts…
        </div>
      );

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          height: '100%',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '18px',
          boxSizing: 'border-box',
        }}
      >
        {/* PHOTO */}
        <div
          style={{
            flex: '0 0 50%',
            paddingRight: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
                boxShadow: '0 0 16px rgba(0,0,0,0.6)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#aaa',
                fontSize: '1.1rem',
              }}
            >
              No photo
            </div>
          )}
        </div>

        {/* TEXT */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontSize: '1.4rem',
              fontWeight: 700,
              margin: 0,
              textShadow: '0 0 12px rgba(0,0,0,0.7)',
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#eee',
              fontSize: '1.1rem',
              lineHeight: 1.4,
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

  /* ---------- FADE VARIANTS ---------- */
  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: fadeDuration / 1000, ease: 'easeInOut' },
    },
    exit: {
      opacity: 0,
      transition: { duration: fadeDuration / 1000, ease: 'easeInOut' },
    },
  };

  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ---------- LOGO ---------- */}
      <div
        style={{
          position: 'absolute',
          top: '3vh',
          right: '3vw',
          width: 'clamp(160px,18vw,220px)',
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
          fontWeight: 900,
          fontSize: 'clamp(2.5rem,4vw,5rem)',
          marginBottom: '4vh',
          textAlign: 'center',
          textShadow: '0 0 25px rgba(0,0,0,0.6)',
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* ---------- SINGLE CENTER CELL ---------- */}
      <div
        style={{
          width: '40vw',
          height: '45vh',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={fadeKey}
            variants={fadeVariants}
            initial="visible"
            animate="exit"
            exit="hidden"
            style={{ width: '100%', height: '100%' }}
          >
            <PostCard post={current} />
          </motion.div>
        </AnimatePresence>
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
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'opacity 0.3s ease',
          opacity: 0.25,
          zIndex: 99,
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












