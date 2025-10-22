'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SingleCellWallProps {
  event: any;
  posts: any[];
}

export default function SingleCellWall({ event, posts }: SingleCellWallProps) {
  const [current, setCurrent] = useState<any | null>(null);
  const [postIndex, setPostIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const fadeDuration = 2000; // 2s fade in/out
  const pauseBetween = 600; // pause between transitions
  const displayDuration = 8000; // time per post before fade out

  /* ---------- INITIAL POST ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    setCurrent(posts[0]);
    setPostIndex(1 % posts.length);
  }, [posts]);

  /* ---------- FADE CYCLE ---------- */
  useEffect(() => {
    if (!posts?.length) return;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const loop = async () => {
      while (true) {
        await sleep(displayDuration);
        setIsVisible(false); // fade out
        await sleep(fadeDuration + pauseBetween);
        setCurrent(posts[postIndex % posts.length]);
        setPostIndex((p) => (p + 1) % posts.length);
        setIsVisible(true); // fade in
        await sleep(fadeDuration + pauseBetween);
      }
    };

    loop();
  }, [posts, postIndex]);

  /* ---------- POST CARD ---------- */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div
          style={{
            color: '#fff',
            textAlign: 'center',
            opacity: 0.6,
            fontSize: '1.2rem',
          }}
        >
          Waiting for posts…
        </div>
      );

    return (
      <div
        style={{
          width: '26vw',
          minWidth: '320px',
          height: '38vh',
          minHeight: '300px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 18,
          padding: 20,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          boxShadow: '0 0 30px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* LEFT: PHOTO */}
        <div style={{ flex: '0 0 50%', paddingRight: 12 }}>
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt="Guest submission"
              style={{
                width: '100%',
                aspectRatio: '1/1',
                objectFit: 'cover',
                borderRadius: 14,
                boxShadow: '0 0 12px rgba(0,0,0,0.6)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 14,
              }}
            />
          )}
        </div>

        {/* RIGHT: TEXT */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h3
            style={{
              color: '#fff',
              fontSize: '1.4rem',
              fontWeight: 700,
              margin: 0,
              marginBottom: 6,
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#eee',
              fontSize: '1.1rem',
              fontWeight: 400,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key={current?.id || 'empty'}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 2, ease: 'easeInOut' } }}
            exit={{ opacity: 0, y: -40, transition: { duration: 2, ease: 'easeInOut' } }}
          >
            <PostCard post={current} />
          </motion.div>
        )}
      </AnimatePresence>

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











