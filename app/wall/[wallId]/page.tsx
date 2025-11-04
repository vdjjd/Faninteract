'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useWallData } from '@/app/wall/hooks/useWallData';
import InactiveWall from '@/app/wall/components/wall/InactiveWall';
import SingleHighlightWall from '@/app/wall/components/wall/layouts/SingleHighlightWall';
import Grid2x2Wall from '@/app/wall/components/wall/layouts/Grid2x2Wall';
import Grid4x2Wall from '@/app/wall/components/wall/layouts/Grid4x2Wall';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { cn } from '../../../lib/utils';

export default function FanWallPage() {
  const { wallId } = useParams();
  const wallUUID = Array.isArray(wallId) ? wallId[0] : wallId;

  const { wall, posts, loading, showLive, refresh } = useWallData(wallUUID);

  const [cachedWall, setCachedWall] = useState<any>(null);
  const [cachedPosts, setCachedPosts] = useState<any[]>([]);
  const [displayLive, setDisplayLive] = useState(showLive);
  const [opacityLive, setOpacityLive] = useState(showLive ? 1 : 0);
  const [opacityInactive, setOpacityInactive] = useState(showLive ? 0 : 1);
  const [bg, setBg] = useState('linear-gradient(to bottom right,#1b2735,#090a0f)');
  const [ready, setReady] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);

  const FADE_DURATION = 900;
  const prevLayout = useRef<string | null>(null);
  const fadeTimeout = useRef<NodeJS.Timeout | null>(null);

  /* Cache wall/posts */
  useEffect(() => {
    if (wall) {
      setCachedWall(wall);
      setReady(true);
    }
    if (posts?.length) setCachedPosts(posts);
  }, [wall, posts]);

  /* Dynamic background */
  useEffect(() => {
    if (!cachedWall) return;
    const value =
      cachedWall.background_type === 'image'
        ? `url(${cachedWall.background_value}) center/cover no-repeat`
        : cachedWall.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';
    setBg(value);
  }, [cachedWall?.background_type, cachedWall?.background_value]);

  /* Track layout changes */
  useEffect(() => {
    if (cachedWall?.layout_type && cachedWall?.layout_type !== prevLayout.current) {
      prevLayout.current = cachedWall.layout_type;
      setLayoutKey((prev) => prev + 1);
    }
  }, [cachedWall?.layout_type]);

  /* 🛰️ Standalone realtime listener */
  useEffect(() => {
    if (!wallUUID) return;

    const channel = supabase.channel('fan_walls-realtime', {
      config: { broadcast: { self: true, ack: false } },
    });

    const handleBroadcast = (msg: any) => {
      const { event, payload: data } = msg;
      if (!data?.id || data.id !== wallUUID) return;

      switch (event) {
        case 'wall_status_changed':
          console.log('⚡ Wall status update:', data.status);
          setDisplayLive(data.status === 'live');
          startFade(data.status === 'live');
          refresh();
          break;

        case 'wall_updated':
          console.log('⚡ Wall updated via broadcast:', data);
          setCachedWall(prev => ({ ...(prev || {}), ...data }));
          refresh();
          break;

        case 'countdown_finished':
          console.log('🚀 Countdown finished, wall live');
          setDisplayLive(true);
          startFade(true);
          refresh();
          break;

        default:
          break;
      }
    };

    channel.on('broadcast', {}, handleBroadcast);

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Public wall subscribed to realtime:', wallUUID);
        refresh();
      }
    });

    return () => {
      try {
        channel.unsubscribe();
      } catch (err) {
        console.warn('🧹 Channel cleanup failed:', err);
      }
    };
  }, [wallUUID, refresh]);

  /* Fade transitions */
  useEffect(() => {
    if (showLive !== displayLive) startFade(showLive);
  }, [showLive]);

  function startFade(toLive: boolean) {
    if (fadeTimeout.current) clearTimeout(fadeTimeout.current);

    if (toLive) {
      setOpacityInactive(1);
      requestAnimationFrame(() => {
        setOpacityLive(1);
        setOpacityInactive(0);
      });
      fadeTimeout.current = setTimeout(() => setDisplayLive(true), FADE_DURATION);
    } else {
      setOpacityLive(1);
      requestAnimationFrame(() => {
        setOpacityLive(0);
        setOpacityInactive(1);
      });
      fadeTimeout.current = setTimeout(() => setDisplayLive(false), FADE_DURATION);
    }
  }

  /* Early returns */
  if (loading && !ready)
    return <p className={cn('text-white text-center mt-20 animate-pulse')}>Loading Wall…</p>;
  if (!cachedWall)
    return <p className={cn('text-white text-center mt-20')}>Wall not found.</p>;

  /* Layout selector */
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

  /* Render */
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
        style={{
          position: 'absolute',
          inset: 0,
          opacity: opacityInactive,
          zIndex: opacityInactive > opacityLive ? 2 : 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <InactiveWall wall={cachedWall} />
      </div>

      {/* 🚀 Live Wall */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
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
