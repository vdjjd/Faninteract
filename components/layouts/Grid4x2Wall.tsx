'use client';

import { useEffect, useState } from 'react';

interface Grid1x2WallProps {
  event: any;
  posts: any[];
}

export default function Grid1x2Wall({ event, posts }: Grid1x2WallProps) {
  const [top, setTop] = useState<any | null>(null);
  const [bottom, setBottom] = useState<any | null>(null);
  const [postIndex, setPostIndex] = useState(0);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const fadeDuration = 2000; // 2 seconds
  const pauseBetween = 200; // short pause between transitions
  const displayDuration = 10000; // total cycle delay (adjust if needed)

  /* ---------- INITIAL SETUP ---------- */
  useEffect(() => {
    if (!posts?.length) return;
    setTop(posts[0]);
    setBottom(posts[1] || posts[0]);
    setPostIndex(2 % posts.length);
  }, [posts]);

  /* ---------- FADE CYCLE ---------- */
  useEffect(() => {
    if (!posts?.length) return;

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const cycle = async () => {
      // 1️⃣ Bottom fades out
      setFadeBottom(true);
      await sleep(fadeDuration + pauseBetween);

      // 2️⃣ Top fades out (after bottom gone)
      setFadeTop(true);
      await sleep(fadeDuration + pauseBetween);

      // 3️⃣ Top → Bottom fade in
      setBottom(top);
      setFadeBottom(false);
      await sleep(fadeDuration + pauseBetween);

      // 4️⃣ New top fades in
      const next = posts[postIndex % posts.length];
      setTop(next);
      setPostIndex((p) => (p + 1) % posts.length);
      setFadeTop(false);
    };

    const timer = setInterval(cycle, displayDuration);
    return () => clearInterval(timer);
  }, [posts, top, postIndex]);

  /* ---------- CARD ---------- */
  function PostCard({ post, faded }: { post: any; faded: boolean }) {
    if (!post)
      return (
        <div
          style={{
            color: '#777',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
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
          transition: `opacity ${fadeDuration}ms ease-in-out`,
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
        'linear-gradient(to bottom right, #1b2735, #090a0f)';

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
      }}
    >
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
    </div>
  );
}










