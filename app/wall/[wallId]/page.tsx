'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useWallData } from '@/app/wall/hooks/useWallData';
import InactiveWall from '@/app/wall/components/wall/InactiveWall';
import SingleHighlightWall from '@/app/wall/components/wall/layouts/SingleHighlightWall';
import Grid2x2Wall from '@/app/wall/components/wall/layouts/Grid2x2Wall';
import Grid4x2Wall from '@/app/wall/components/wall/layouts/Grid4x2Wall';
import { cn } from '../../../lib/utils';

export default function FanWallPage() {
  const { wallId } = useParams();
  const wallUUID = Array.isArray(wallId) ? wallId[0] : wallId;

  // ✅ Hook pulls wall + posts
  const { wall, posts, loading, showLive } = useWallData(wallUUID);

  // ✅ Local cache for faster UI
  const [cachedWall, setCachedWall] = useState<any>(null);
  const [cachedPosts, setCachedPosts] = useState<any[]>([]);
  const [displayLive, setDisplayLive] = useState(showLive);
  const [opacityLive, setOpacityLive] = useState(showLive ? 1 : 0);
  const [opacityInactive, setOpacityInactive] = useState(showLive ? 0 : 1);
  const [bg, setBg] = useState('linear-gradient(to bottom right,#1b2735,#090a0f)');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [countdownRunning, setCountdownRunning] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);
  const [ready, setReady] = useState(false);

  const FADE_DURATION = 1000;
  const prevLayout = useRef<string | null>(null);

  /* ⚙️ Cache + ready flag */
  useEffect(() => {
    if (wall) {
      setCachedWall(wall);
      setReady(true);
    }
    if (posts?.length) setCachedPosts(posts);
  }, [wall, posts]);

  /* 🎨 Background reactive update */
  useEffect(() => {
    if (!wall) return;
    const newBg =
      wall.background_type === 'image' && wall.background_value
        ? `url(${wall.background_value}) center/cover no-repeat`
        : wall.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';
    setBg(newBg);
  }, [wall?.background_type, wall?.background_value]);

  /* 🔄 Layout change re-render (only if layout actually changes) */
  useEffect(() => {
    if (wall?.layout_type && wall?.layout_type !== prevLayout.current) {
      prevLayout.current = wall.layout_type;
      setLayoutKey((prev) => prev + 1);
    }
  }, [wall?.layout_type]);

  /* ⏳ Countdown setup */
  useEffect(() => {
    if (!wall?.countdown || wall.countdown === 'none') {
      setTimeLeft(null);
      setCountdownRunning(false);
      return;
    }

    const num = parseInt(wall.countdown.split(' ')[0]);
    const secs = wall.countdown.toLowerCase().includes('second');
    const totalSeconds = secs ? num : num * 60;
    setTimeLeft(totalSeconds);
    setCountdownRunning(!!wall.countdown_active);
  }, [wall?.countdown, wall?.countdown_active]);

  /* ⏱️ Countdown fade */
  useEffect(() => {
    if (!countdownRunning || timeLeft === null) return;
    if (timeLeft <= 0) {
      setCountdownRunning(false);
      startFade(true);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => (t && t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownRunning, timeLeft]);

  /* 🎬 Fade manager for play/stop */
  useEffect(() => {
    if (showLive === displayLive) return;
    startFade(showLive);
  }, [showLive]);

  function startFade(toLive: boolean) {
    if (toLive) {
      setOpacityInactive(1);
      requestAnimationFrame(() => {
        setOpacityLive(1);
        setOpacityInactive(0);
      });
      const timer = setTimeout(() => setDisplayLive(true), FADE_DURATION);
      return () => clearTimeout(timer);
    } else {
      setOpacityLive(1);
      requestAnimationFrame(() => {
        setOpacityLive(0);
        setOpacityInactive(1);
      });
      const timer = setTimeout(() => setDisplayLive(false), FADE_DURATION);
      return () => clearTimeout(timer);
    }
  }

  /* 🧱 Early returns */
  if (!ready)
    return <p className={cn('text-white', 'text-center', 'mt-20 animate-pulse')}>Loading Wall…</p>;
  if (!cachedWall)
    return <p className={cn('text-white', 'text-center', 'mt-20')}>Wall not found.</p>;

  /* 🎛 Layout selector */
  const renderActiveWall = () => {
    const layout = cachedWall.layout_type;
    switch (layout) {
      case 'Grid 2x2':
      case '2x2':
      case '2x2 Grid':
        return <Grid2x2Wall key={layoutKey} event={cachedWall} posts={cachedPosts} />;
      case 'Grid 4x2':
      case '4x2':
      case '4x2 Grid':
        return <Grid4x2Wall key={layoutKey} event={cachedWall} posts={cachedPosts} />;
      default:
        return <SingleHighlightWall key={layoutKey} event={cachedWall} posts={cachedPosts} />;
    }
  };

  /* 🧭 Render wrapper with fade */
  return (
    <div
      className="fade-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: bg,
        transition: 'background 0.6s ease-in-out',
      }}
    >
      {/* 💤 Inactive Wall */}
      <div
        className="fade-layer"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: opacityInactive,
          zIndex: opacityInactive > opacityLive ? 2 : 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <InactiveWall wall={cachedWall} />
      </div>

      {/* 🚀 Active Wall */}
      <div
        className="fade-layer"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: opacityLive,
          zIndex: opacityLive > opacityInactive ? 2 : 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        {renderActiveWall()}
      </div>
    </div>
  );
}

