'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

interface Grid2x2WallProps {
  event: any;
  posts: any[];
}

/* ---------- SPEED MAP ---------- */
const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function Grid2x2Wall({ event, posts }: Grid2x2WallProps) {
  const [gridPosts, setGridPosts] = useState<(any | null)[]>([null, null, null, null]);
  const [displayDuration, setDisplayDuration] = useState(
    speedMap[event?.transition_speed || 'Medium']
  );

  const order = useRef([0, 1, 2, 3]);
  const postIndex = useRef(0);
  const cellIndex = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resetKey = useRef(0);

  /* ---------- UPDATE SPEED LIVE ---------- */
  useEffect(() => {
    const newDuration = speedMap[event?.transition_speed || 'Medium'];
    setDisplayDuration(newDuration);
    resetKey.current += 1;
  }, [event?.transition_speed]);

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

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right, #1b2735, #090a0f)';

  /* ---------- FADE DURATION ---------- */
  const fadeDurations: Record<string, number> = {
    Slow: 1.6,
    Medium: 1.2,
    Fast: 0.8,
  };
  const fadeDuration = fadeDurations[event?.transition_speed || 'Medium'];

  /* ---------- INITIAL GRID ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    const initial = posts.slice(0, 4);
    setGridPosts([initial[0] || null, initial[1] || null, initial[2] || null, initial[3] || null]);
    postIndex.current = 4 % posts.length;
    cellIndex.current = 0;
  }, [posts, resetKey.current]);

  /* ---------- FADE LOOP ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const cycle = () => {
      const nextPost = posts[postIndex.current % posts.length];
      const cellToUpdate = order.current[cellIndex.current % order.current.length];

      setGridPosts((prev) => {
        const newGrid = [...prev];
        newGrid[cellToUpdate] = nextPost;
        return newGrid;
      });

      postIndex.current = (postIndex.current + 1) % posts.length;
      cellIndex.current = (cellIndex.current + 1) % order.current.length;
    };

    intervalRef.current = setInterval(cycle, displayDuration);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [posts, displayDuration, resetKey.current]);

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
        <div style={{ flex: 1, position: 'relative', padding: '2px 0 2px 2px' }}>
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt="Guest submission"
              style={{
                width: '100%',
                height: '100%',
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
                height: '100%',
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

        {/* RIGHT: TEXT */}
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
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 18px' }}>
            <h3
              style={{
                color: '#fff',
                fontWeight: 800,
                fontSize: 'clamp(1.6rem, 2.2vw, 2.4rem)',
                textShadow:
                  '0 0 12px rgba(255,255,255,0.8), 0 0 20px rgba(100,180,255,0.6)',
                margin: 0,
              }}
            >
              {post.nickname || ''}
            </h3>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px 12px' }}>
            <p
              style={{
                color: '#ddd',
                fontSize: 'clamp(1.1rem, 1.6vw, 1.8rem)',
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

  /* ---------- FADE VARIANTS ---------- */
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
      transition: { duration: fadeDuration, ease: 'easeInOut', delay: 0.2 },
    },
  };

  /* ---------- BACKGROUND ---------- */
  const driftKeyframes = `
    @keyframes bgDrift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;

  const bgStyle: React.CSSProperties = {
    background: bg,
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    animation: 'bgDrift 120s linear infinite',
  };

  /* ---------- RENDER ---------- */
  return (
    <>
      <style>{driftKeyframes}</style>
      <div style={bgStyle}>
        {/* LOGO */}
        <div style={{ position: 'absolute', top: '3vh', right: '3vw', width: 'clamp(160px, 18vw, 220px)', zIndex: 20 }}>
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

        {/* GRID */}
        <div
          style={{
            width: '80vw',
            height: '70vh',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
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

        {/* QR */}
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
              style={{ borderRadius: 10, display: 'block' }}
            />
          </div>
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
    </>
  );
}
