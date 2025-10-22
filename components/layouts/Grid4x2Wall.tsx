'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Grid1x2WallProps {
  event: any;
  posts: any[];
}

const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function Grid1x2Wall({ event, posts }: Grid1x2WallProps) {
  const [top, setTop] = useState<any | null>(null);
  const [bottom, setBottom] = useState<any | null>(null);
  const [postIndex, setPostIndex] = useState(0);

  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;
  const fadeDuration = 1000;

  /* ---------- INITIAL SETUP ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    setTop(posts[0]);
    setBottom(posts[1] || posts[0]);
    setPostIndex(2 % posts.length);
  }, [posts]);

  /* ---------- ANIMATION LOOP ---------- */
  useEffect(() => {
    if (!posts?.length) return;

    function cycle() {
      // STEP 1: Fade out bottom
      setFadeBottom(true);

      setTimeout(() => {
        // STEP 2: Fade out top
        setFadeTop(true);
      }, fadeDuration * 0.5);

      setTimeout(() => {
        // STEP 3: Move top → bottom
        setBottom(top);
      }, fadeDuration * 1.0);

      setTimeout(() => {
        // STEP 4: Replace top with new post
        const next = posts[postIndex % posts.length];
        setTop(next);
        setPostIndex((p) => (p + 1) % posts.length);
      }, fadeDuration * 1.5);

      setTimeout(() => {
        // STEP 5: Fade everything back in
        setFadeTop(false);
        setFadeBottom(false);
      }, fadeDuration * 2);
    }

    timerRef.current = setInterval(cycle, displayDuration);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [posts, top, postIndex]);

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* ---------- POST CARD ---------- */
  function PostCard({
    post,
    faded,
  }: {
    post: any;
    faded?: boolean;
  }) {
    if (!post)
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            color: '#777',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}
        >
          Waiting...
        </div>
      );

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: faded ? 0 : 1,
          transform: faded ? 'translateY(10px)' : 'translateY(0)',
          transition: `opacity ${fadeDuration}ms ease-in-out, transform ${fadeDuration}ms ease-in-out`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 12,
          boxShadow: '0 0 18px rgba(0,0,0,0.4)',
        }}
      >
        {/* PHOTO */}
        <div
          style={{
            flex: '0 0 60%',
            paddingRight: '10px',
          }}
        >
          {post.photo_url ? (
            <img
              src={post.photo_url}
              alt="Fan"
              style={{
                width: '100%',
                aspectRatio: '1/1',
                objectFit: 'cover',
                borderRadius: 10,
                filter: faded
                  ? 'blur(1px) brightness(0.7)'
                  : 'blur(0) brightness(1)',
                transition: `filter ${fadeDuration}ms ease-in-out`,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 10,
                color: '#aaa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              No Photo
            </div>
          )}
        </div>

        {/* TEXT */}
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontSize: '1.2rem',
              margin: 0,
              fontWeight: 700,
              textShadow: '0 0 12px rgba(0,0,0,0.5)',
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#ddd',
              fontSize: '1rem',
              margin: 0,
              textShadow: '0 0 10px rgba(0,0,0,0.4)',
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

  /* ---------- LAYOUT ---------- */
  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ONE COLUMN */}
      <div
        style={{
          width: '22vw',
          height: '70vh',
          display: 'grid',
          gridTemplateRows: 'repeat(2, 1fr)',
          borderRadius: 20,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        <PostCard post={top} faded={fadeTop} />
        <PostCard post={bottom} faded={fadeBottom} />
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
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.25,
          transition: 'opacity 0.3s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen().catch(console.error);
          else document.exitFullscreen();
        }}
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









