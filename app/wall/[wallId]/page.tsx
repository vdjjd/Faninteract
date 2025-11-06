'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useWallData } from '@/app/wall/hooks/useWallData';
import { useAdInjector } from '@/hooks/useAdInjector'; // ✅ NEW
import InactiveWall from '@/app/wall/components/wall/InactiveWall';
import SingleHighlightWall from '@/app/wall/components/wall/layouts/SingleHighlightWall';
import Grid2x2Wall from '@/app/wall/components/wall/layouts/Grid2x2Wall';
import Grid4x2Wall from '@/app/wall/components/wall/layouts/Grid4x2Wall';
import AdOverlay from '@/app/wall/components/AdOverlay';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { cn } from '../../../lib/utils';

export default function FanWallPage() {
  const { wallId } = useParams();
  const wallUUID = Array.isArray(wallId) ? wallId[0] : wallId;
  const { wall, posts, loading, showLive } = useWallData(wallUUID);
  const channelRef = useRealtimeChannel();

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

  /* ✅ Initial load */
  useEffect(() => {
    if (wall) {
      setCachedWall(wall);
      setReady(true);
    }
    if (posts?.length) setCachedPosts(posts);
  }, [wall, posts]);

  /* ✅ Background updates */
  useEffect(() => {
    if (!cachedWall) return;
    const value =
      cachedWall.background_type === 'image'
        ? `url(${cachedWall.background_value}) center/cover no-repeat`
        : cachedWall.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';
    setBg(value);
  }, [cachedWall?.background_type, cachedWall?.background_value]);

  /* ✅ Layout switch */
  useEffect(() => {
    if (cachedWall?.layout_type && cachedWall?.layout_type !== prevLayout.current) {
      prevLayout.current = cachedWall.layout_type;
      setLayoutKey(prev => prev + 1);
    }
  }, [cachedWall?.layout_type]);

  /* ✅ Realtime events */
  useEffect(() => {
    if (!channelRef?.current || !wallUUID) return;
    const channel = channelRef.current;
    const handleBroadcast = (msg: any) => {
      const { event, payload: data } = msg;
      if (!data?.id || data.id !== wallUUID) return;

      switch (event) {
        case 'wall_status_changed':
          setDisplayLive(data.status === 'live');
          startFade(data.status === 'live');
          break;
        case 'wall_updated':
          setCachedWall(prev => ({ ...(prev || {}), ...data }));
          break;
        case 'countdown_finished':
          setDisplayLive(true);
          startFade(true);
          break;
      }
    };
    channel.on('broadcast', {}, handleBroadcast);
    return () => channel.on('broadcast', {}, () => {});
  }, [channelRef, wallUUID]);

  /* ✅ Polling fallback */
  useEffect(() => {
    if (!wallUUID) return;
    let interval: NodeJS.Timeout;
    let lastUpdated = cachedWall?.updated_at;
    async function pollWallState() {
      const { data } = await supabase
        .from('fan_walls')
        .select('*')
        .eq('id', wallUUID)
        .maybeSingle();
      if (!data) return;
      if (lastUpdated !== data.updated_at) {
        lastUpdated = data.updated_at;
        setCachedWall(prev => ({ ...(prev || {}), ...data }));
        const shouldBeLive = data.status === 'live';
        setDisplayLive(prev => {
          if (prev !== shouldBeLive) startFade(shouldBeLive);
          return shouldBeLive;
        });
      }
    }
    interval = setInterval(pollWallState, 1000);
    return () => clearInterval(interval);
  }, [wallUUID, cachedWall?.updated_at]);

  /* ✅ Fade sync */
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

  /* ✅ Hook up the Ad Injector */
  const { ads, showAd, currentAdIndex, injectorEnabled, handlePostRotationTick } = useAdInjector({
    hostId: cachedWall?.host_profile_id || '',
    triggerInterval: cachedWall?.trigger_interval || 8,
  });

  if (loading && !ready)
    return <p className={cn('text-white text-center mt-20 animate-pulse')}>Loading Wall…</p>;
  if (!cachedWall)
    return <p className={cn('text-white text-center mt-20')}>Wall not found.</p>;

  const renderActiveWall = () => {
    const layout = cachedWall.layout_type;
    const bgValue = cachedWall.background_value;
    const props = {
      event: cachedWall,
      posts: cachedPosts,
      background: bgValue,
      onPostRotation: handlePostRotationTick, // ✅ track rotations
    };
    switch (layout) {
      case 'Grid 2x2':
      case '2x2':
      case '2x2 Grid':
        return <Grid2x2Wall key={layoutKey} {...props} />;
      case 'Grid 4x2':
      case '4x2':
      case '4x2 Grid':
        return <Grid4x2Wall key={layoutKey} {...props} />;
      default:
        return <SingleHighlightWall key={layoutKey} {...props} />;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: bg,
        transition: 'background 0.6s ease-in-out',
      }}
    >
      {/* Inactive */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: opacityInactive,
          zIndex: 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <InactiveWall wall={cachedWall} />
      </div>

      {/* Live */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: opacityLive,
          zIndex: 2,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        {renderActiveWall()}
      </div>

      {/* ✅ Ad Overlay — only visible during ad display */}
      <AdOverlay
        showAd={showAd && injectorEnabled}
        ads={ads}
        currentAdIndex={currentAdIndex}
        onAdEnd={() => {}}
      />
    </div>
  );
}
