'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Grid1x2WallProps {
  event: any;
  posts: any[];
}

export default function Grid1x2Wall({ event, posts }: Grid1x2WallProps) {
  const [top, setTop] = useState<any | null>(null);
  const [bottom, setBottom] = useState<any | null>(null);
  const [postIndex, setPostIndex] = useState(0);
  const [fadeStage, setFadeStage] = useState<
    'bottomOut' | 'topOut' | 'bottomIn' | 'topIn' | null
  >(null);

  const fadeDuration = 2000; // 2s fade
  const pauseBetween = 400;
  const displayDuration = 10000;

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    setTop(posts[0]);
    setBottom(posts[1] || posts[0]);
    setPostIndex(2 % posts.length);
  }, [posts]);

  /* ---------- MAIN SEQUENCE ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const cycle = async () => {
      setFadeStage('bottomOut');
      await sleep(fadeDuration + pauseBetween);

      setFadeStage('topOut');
      await sleep(fadeDuration + pauseBetween);

      setBottom(top);
      setFadeStage('bottomIn');
      await sleep(fadeDuration + pauseBetween);

      const next = posts[postIndex % posts.length];
      setTop(next);
      setPostIndex((p) => (p + 1) % posts.length);
      setFadeStage('topIn');
      await sleep(fadeDuration + pauseBetween);

      setFadeStage(null);
    };

    const timer = setInterval(cycle, displayDuration);
    return () => clearInterval(timer);
  }, [posts, top, postIndex]);

  /* ---------- FADE VARIANTS ---------- */
  const variants = {
    hidden: { opacity: 0, y: 30, transition: { duration: 2, ease: 'easeInOut' } },
    visible: { opacity: 1, y: 0, transition: { duration: 2, ease: 'easeInOut' } },
  };

  /* ---------- POST CARD ---------- */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return (
        <div className="flex items-center justify-center text-white text-lg opacity-60">
          Waiting...
        </div>
      );

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <div style={{ flex: '0 0 60%', paddingRight: 8 }}>
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt=""
              style={{
                width: '100%',
                aspectRatio: '1/1',
                objectFit: 'cover',
                borderRadius: 10,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 10,
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>{post.nickname || ''}</h3>
          <p style={{ color: '#ddd', margin: 0 }}>{post.message || ''}</p>
        </div>
      </div>
    );
  }

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* ---------- RENDER ---------- */
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
      {/* MAIN GRID */}
      <div
        style={{
          width: '22vw',
          height: '70vh',
          display: 'grid',
          gridTemplateRows: 'repeat(2,1fr)',
          borderRadius: 20,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        {/* TOP ROW */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`top-${fadeStage}-${top?.id || 'empty'}`}
            variants={variants}
            initial="hidden"
            animate={fadeStage === 'topOut' ? 'hidden' : 'visible'}
            exit="hidden"
            style={{ width: '100%', height: '100%' }}
          >
            <PostCard post={top} />
          </motion.div>
        </AnimatePresence>

        {/* BOTTOM ROW */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bottom-${fadeStage}-${bottom?.id || 'empty'}`}
            variants={variants}
            initial="hidden"
            animate={fadeStage === 'bottomOut' ? 'hidden' : 'visible'}
            exit="hidden"
            style={{ width: '100%', height: '100%' }}
          >
            <PostCard post={bottom} />
          </motion.div>
        </AnimatePresence>
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











