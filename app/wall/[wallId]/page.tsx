'use client';
import React, { useState, useEffect } from 'react';
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
  const { wall, posts, loading, showLive } = useWallData(wallUUID);

  const [displayLive, setDisplayLive] = useState(showLive);
  const [opacityLive, setOpacityLive] = useState(showLive ? 1 : 0);
  const [opacityInactive, setOpacityInactive] = useState(showLive ? 0 : 1);
  const [bg, setBg] = useState('linear-gradient(to bottom right,#1b2735,#090a0f)');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [countdownRunning, setCountdownRunning] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0); // 🔑 Force re-render on layout change

  const FADE_DURATION = 1200; // ms

  /* 🎨 Background reactive update */
  useEffect(() => {
    if (!wall) return;
    const newBg =
      wall.background_type === 'image' && wall.background_value
        ? `url(${wall.background_value}) center/cover no-repeat`
        : wall.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';
    setBg(newBg);
  }, [wall?.background_type, wall?.background_value]);

  /* 🔄 Layout change re-render */
  useEffect(() => {
    if (wall?.layout_type) setLayoutKey((prev) => prev + 1);
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

  /* ⏱️ Timer countdown logic — fade starts instantly when zero */
  useEffect(() => {
    if (!countdownRunning || timeLeft === null) return;

    if (timeLeft <= 0) {
      setCountdownRunning(false);

      // 🚀 Begin fade instantly when timer hits zero
      setOpacityInactive(1);
      requestAnimationFrame(() => {
        setOpacityLive(1);
        setOpacityInactive(0);
      });
      const timer = setTimeout(() => setDisplayLive(true), FADE_DURATION);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => (t !== null && t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownRunning, timeLeft]);

  /* 🔁 Fade logic for play/stop toggles */
  useEffect(() => {
    if (showLive === displayLive) return;

    if (showLive) {
      setOpacityInactive(1);
      requestAnimationFrame(() => {
        setOpacityLive(1);
        setOpacityInactive(0);
      });
      const timer = setTimeout(() => setDisplayLive(true), FADE_DURATION);
      return () => clearTimeout(timer);
    }

    setOpacityLive(1);
    requestAnimationFrame(() => {
      setOpacityLive(0);
      setOpacityInactive(1);
    });
    const timer = setTimeout(() => setDisplayLive(false), FADE_DURATION);
    return () => clearTimeout(timer);
  }, [showLive, displayLive]);

  /* 🧱 Early returns */
  if (loading && !wall)
    return <p className={cn('text-white', 'text-center', 'mt-20')}>Loading Wall…</p>;
  if (!wall)
    return <p className={cn('text-white', 'text-center', 'mt-20')}>Wall not found.</p>;

  /* 🎛 Layout selector */
  const renderActiveWall = () => {
    switch (wall.layout_type) {
      case 'Grid 2x2':
      case '2x2':
      case '2x2 Grid':
        return <Grid2x2Wall key={layoutKey} event={wall} posts={posts} />;
      case 'Grid 4x2':
      case '4x2':
      case '4x2 Grid':
        return <Grid4x2Wall key={layoutKey} event={wall} posts={posts} />;
      default:
        return <SingleHighlightWall key={layoutKey} event={wall} posts={posts} />;
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
        transition: 'background 0.8s ease-in-out',
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
        <InactiveWall wall={wall} />
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

