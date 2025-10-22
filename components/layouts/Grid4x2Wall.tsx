'use client';

import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Grid4x2WallProps {
  event: any;
  posts: any[];
}

const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function Grid4x2Wall({ event, posts }: Grid4x2WallProps) {
  const [grid, setGrid] = useState<any[][]>([[], [], [], []]); // 4 columns × 2 rows
  const [postIndex, setPostIndex] = useState(0);
  const [activeCell, setActiveCell] = useState(0);
  const [fading, setFading] = useState<number | null>(null);

  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;
  const fadeDuration = 1000;

  // ---------- INITIAL SETUP ----------
  useEffect(() => {
    if (!posts?.length) return;
    const repeated = [...posts];
    while (repeated.length < 8) repeated.push(...posts);
    const filled = [[], [], [], []].map((_, i) =>
      repeated.slice(i * 2, i * 2 + 2)
    );
    setGrid(filled);
    setPostIndex(repeated.length % posts.length);
  }, [posts]);

  // ---------- ONE CELL AT A TIME UPDATE ----------
  useEffect(() => {
    if (!posts?.length) return;
    let cancel = false;

    async function cycle() {
      while (!cancel) {
        const next = posts[postIndex % posts.length];
        const c = activeCell; // which column is updating

        // Fade out the top cell
        setFading(c);
        await wait(fadeDuration);

        // Move top → bottom
        setGrid((prev) => {
          const updated = [...prev];
          const col = [...updated[c]];
          col[1] = col[0]; // move old top to bottom
          updated[c] = col;
          return updated;
        });

        // Reset fade
        setFading(null);

        // Small pause before fade-in
        await wait(300);

        // Fade-in new top post
        setGrid((prev) => {
          const updated = [...prev];
          const col = [...updated[c]];
          col[0] = next;
          updated[c] = col;
          return updated;
        });

        setPostIndex((p) => (p + 1) % posts.length);

        // Wait full display time before next column
        await wait(displayDuration);
        setActiveCell((prev) => (prev + 1) % 4);
      }
    }

    cycle();
    return () => {
      cancel = true;
    };
  }, [posts, postIndex, activeCell]);

  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // ---------- BACKGROUND ----------
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  // ---------- POST CARD ----------
  function PostCard({ post, faded }: { post: any; faded?: boolean }) {
    if (!post)
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            color: '#aaa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}
        >
          Waiting for posts…
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
          opacity: faded ? 0 : 1,
          transition: 'opacity 1s ease-in-out',
          borderRadius: 14,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '14px',
          boxSizing: 'border-box',
        }}
      >
        {/* PHOTO */}
        <div
          style={{
            flex: '0 0 60%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingRight: '10px',
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

        {/* TEXT */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: '6px',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.2rem',
              margin: 0,
            }}
          >
            {post.nickname || ''}
          </h3>
          <p
            style={{
              color: '#eee',
              fontSize: '1rem',
              margin: 0,
            }}
          >
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

  // ---------- RENDER ----------
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
        overflow: 'hidden',
      }}
    >
      {/* TITLE */}
      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          marginTop: '3vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* GRID */}
      <div
        style={{
          width: '90vw',
          height: '70vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gridTemplateRows: 'repeat(2,1fr)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {grid.map((col, ci) =>
          col.map((post, ri) => (
            <PostCard
              key={(post?.id || 'empty') + '-' + ci + '-' + ri}
              post={post}
              faded={fading === ci && ri === 0}
            />
          ))
        )}
      </div>

      {/* QR */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(17vh - 90px)',
          left: 'calc(9vw - 90px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 'clamp(1.2rem,1.8vw,2rem)',
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





