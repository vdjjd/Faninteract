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
  const [grid, setGrid] = useState<any[][]>([[], [], [], []]);
  const [postIndex, setPostIndex] = useState(0);
  const [activeColumn, setActiveColumn] = useState(0);
  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;

  const fadeDuration = 1000;

  // ---------- INITIAL POPULATION ----------
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

  // ---------- SEQUENTIAL COLUMN UPDATE ----------
  useEffect(() => {
    if (!posts?.length) return;
    let cancel = false;

    async function runCycle() {
      while (!cancel) {
        const col = activeColumn;
        const next = posts[postIndex % posts.length];
        setPostIndex((p) => (p + 1) % posts.length);

        // Animate that column only
        setGrid((prev) => {
          const updated = [...prev];
          const colData = [...updated[col]];
          // move top to bottom, then temporarily blank top
          colData[1] = colData[0];
          colData[0] = { fadingOut: true, ...colData[0] };
          updated[col] = colData;
          return updated;
        });

        // fade out then replace
        await wait(fadeDuration);

        setGrid((prev) => {
          const updated = [...prev];
          const colData = [...updated[col]];
          colData[0] = next;
          updated[col] = colData;
          return updated;
        });

        // Wait for next column
        await wait(displayDuration);
        setActiveColumn((c) => (c + 1) % 4);
      }
    }

    runCycle();
    return () => {
      cancel = true;
    };
  }, [posts, activeColumn]);

  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  // ---------- POST CARD ----------
  function PostCard({ post }: { post: any }) {
    const [fade, setFade] = useState(false);

    useEffect(() => {
      if (post?.fadingOut) {
        setFade(true);
        const t = setTimeout(() => setFade(false), fadeDuration);
        return () => clearTimeout(t);
      }
    }, [post?.fadingOut]);

    if (!post || !Object.keys(post).length)
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            color: '#777',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
          opacity: fade ? 0 : 1,
          transition: 'opacity 1s ease-in-out',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '12px',
        }}
      >
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
              alt="Guest"
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                objectFit: 'cover',
                borderRadius: 12,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                background: 'rgba(255,255,255,0.05)',
                color: '#999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
              }}
            >
              No Photo
            </div>
          )}
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '6px',
          }}
        >
          <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>
            {post.nickname || ''}
          </h3>
          <p style={{ color: '#eee', margin: 0, fontSize: '0.9rem' }}>
            {post.message || ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          marginTop: '3vh',
          marginBottom: '2vh',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      <div
        style={{
          width: '90vw',
          height: '70vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gridTemplateRows: 'repeat(2,1fr)',
          gap: 0,
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {grid.map((col, ci) =>
          col.map((post, ri) => (
            <PostCard key={`${ci}-${ri}-${post?.id || 'empty'}`} post={post} />
          ))
        )}
      </div>

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
            fontWeight: 700,
            fontSize: 'clamp(1.2rem,1.8vw,2rem)',
          }}
        >
          Scan Me To Join
        </p>
        <QRCodeCanvas
          value={`https://faninteract.vercel.app/submit/${event.id}`}
          size={180}
          bgColor="#fff"
          fgColor="#000"
          level="H"
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






