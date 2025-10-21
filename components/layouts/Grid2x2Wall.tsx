'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';

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

/* ---------- EASING ---------- */
const dropEase = [0.175, 0.885, 0.32, 1.275]; // easeOutBack

export default function Grid2x2Wall({ event, posts }: Grid2x2WallProps) {
  const [leftPosts, setLeftPosts] = useState<any[]>([]);
  const [rightPosts, setRightPosts] = useState<any[]>([]);
  const [postIndex, setPostIndex] = useState(0);
  const [isLeftTurn, setIsLeftTurn] = useState(true);

  const displayDuration =
    speedMap[event?.transition_speed || 'Medium'] || 8000;

  /* ---------- INITIAL POPULATION ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    // Fill 2 per column initially (4 total)
    setLeftPosts(posts.slice(0, 2));
    setRightPosts(posts.slice(2, 4));
    setPostIndex(4 % posts.length);
  }, [posts]);

  /* ---------- CYCLIC UPDATES ---------- */
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const interval = setInterval(() => {
      const nextPost = posts[postIndex % posts.length];
      setPostIndex((prev) => (prev + 1) % posts.length);

      if (isLeftTurn) {
        setLeftPosts((prev) => {
          const newList = [nextPost, ...prev].slice(0, 2);
          return newList;
        });
      } else {
        setRightPosts((prev) => {
          const newList = [nextPost, ...prev].slice(0, 2);
          return newList;
        });
      }

      setIsLeftTurn((prev) => !prev);
    }, displayDuration);

    return () => clearInterval(interval);
  }, [posts, isLeftTurn, displayDuration, postIndex]);

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
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: '#000',
          position: 'relative',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}
      >
        {post.photo_url && (
          <img
            src={post.photo_url}
            alt="Guest submission"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              top: 0,
              left: 0,
              zIndex: 1,
              opacity: 0.9,
            }}
          />
        )}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            padding: '10px 14px',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.6rem',
              marginBottom: 4,
              textShadow: '0 0 10px rgba(0,0,0,0.7)',
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#eee',
              fontSize: '1.2rem',
              fontWeight: 500,
              lineHeight: 1.3,
              textShadow: '0 0 8px rgba(0,0,0,0.5)',
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

  /* ---------- COLUMN ANIMATION ---------- */
  const columnVariants = {
    enter: { y: -100, opacity: 0 },
    center: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: dropEase },
    },
    exit: {
      y: 100,
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeIn' },
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
        transition: 'background 0.8s ease',
      }}
    >
      {/* ---------- LOGO TOP RIGHT ---------- */}
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

      {/* ---------- MEDIA CONTAINER ---------- */}
      <div
        style={{
          width: '80vw',
          height: '70vh',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(14px)',
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence initial={false}>
            {leftPosts.map((post, i) => (
              <motion.div
                key={post.id + '-left-' + i}
                variants={columnVariants}
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

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence initial={false}>
            {rightPosts.map((post, i) => (
              <motion.div
                key={post.id + '-right-' + i}
                variants={columnVariants}
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
      </div>

      {/* ---------- QR SECTION ---------- */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(17vh - 90px)',
          left: 'calc(9vw - 90px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
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
    </div>
  );
}
