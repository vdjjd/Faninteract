'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { clearFanWallPosts, deleteFanWall } from '@/lib/actions/fan_walls';
import { cn } from '../../../../lib/utils';

interface FanWallGridProps {
  walls: any[] | undefined;
  host: any;
  refreshFanWalls: () => Promise<void>;
  onOpenOptions: (wall: any) => void;
}

export default function FanWallGrid({
  walls,
  host,
  refreshFanWalls,
  onOpenOptions,
}: FanWallGridProps) {
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [channelReady, setChannelReady] = useState(false);
  const broadcastRef = useRef<any>(null);

  /* ✅ GLOBAL BROADCAST CHANNEL (TypeScript-safe cleanup) */
  useEffect(() => {
    const channel = supabase.channel('global-fan-walls', {
  config: { broadcast: { self: true, ack: true } },
});

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Joined global-fan-walls realtime channel');
        setChannelReady(true);
      }
    });

    broadcastRef.current = channel;

    // ✅ Cleanup (non-async, no await)
    return () => {
      supabase.removeChannel(channel);
      console.log('❌ Left global-fan-walls realtime channel');
    };
  }, []);

  async function safeBroadcast(event: string, data: any) {
    if (!channelReady || !broadcastRef.current) return;
    try {
      await broadcastRef.current.send({ type: 'broadcast', event, payload: data });
      console.log(`📡 Broadcast sent [${event}]`, data);
    } catch (err) {
      console.error(`❌ Broadcast error [${event}]`, err);
    }
  }

  const safeWalls = walls || [];

  /* 🚀 Launch popup */
  function handleLaunch(id: string) {
    const url = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      url,
      '_blank',
      'width=1280,height=800,left=100,top=100,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  /* ▶️ Start wall */
  async function handleStart(id: string) {
    try {
      const { data: current, error } = await supabase
        .from('fan_walls')
        .select('countdown')
        .eq('id', id)
        .single();
      if (error) throw error;

      if (current?.countdown && current.countdown !== 'none') {
        // 🕒 Countdown mode — do NOT set status inactive
        await supabase
          .from('fan_walls')
          .update({
            countdown_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        await safeBroadcast('wall_updated', { id, countdown_active: true });
        console.log('📡 Countdown started for', id);

        // Automatically mark live when countdown ends (client-side timer simulation)
        // Use approximate duration derived from label
        const durationMs = parseCountdownDuration(current.countdown);
        setTimeout(async () => {
          await supabase
            .from('fan_walls')
            .update({
              status: 'live',
              countdown_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

          await safeBroadcast('countdown_finished', { id, status: 'live' });
          await safeBroadcast('wall_status_changed', { id, status: 'live' });
          console.log('✅ Countdown finished → wall live', id);
          await refreshFanWalls();
        }, durationMs);
      } else {
        // 🚀 Instant live
        await supabase
          .from('fan_walls')
          .update({
            status: 'live',
            countdown_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        await safeBroadcast('wall_status_changed', { id, status: 'live' });
      }

      await refreshFanWalls();
    } catch (err) {
      console.error('❌ Error starting wall:', err);
    }
  }

  // Helper to convert countdown string to ms
  function parseCountdownDuration(label: string): number {
    const num = parseInt(label);
    if (label.includes('Second')) return num * 1000;
    if (label.includes('Minute')) return num * 60 * 1000;
    return 0;
  }

  /* ⏹ Stop wall */
  async function handleStop(id: string) {
    try {
      await supabase
        .from('fan_walls')
        .update({
          status: 'inactive',
          countdown_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      await safeBroadcast('wall_updated', { id, countdown_active: false });
      await safeBroadcast('wall_status_changed', { id, status: 'inactive' });
      console.log('🛑 Wall stopped', id);
      await refreshFanWalls();
    } catch (err) {
      console.error('❌ Error stopping wall:', err);
    }
  }

  /* 🧹 Clear posts */
  async function handleClear(id: string) {
    await clearFanWallPosts(id);
    await refreshFanWalls();
  }

  /* ❌ Delete wall */
  async function handleDelete(id: string) {
    await deleteFanWall(id);
    await safeBroadcast('wall_status_changed', { id, status: 'deleted' });
    await refreshFanWalls();
  }

  /* 🧩 Moderation popup */
  function openModerationPopup(wallId: string) {
    const w = 1280;
    const h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      `/admin/moderation/${wallId}`,
      `moderation_${wallId}`,
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    popup?.focus();
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        refreshFanWalls();
      }
    }, 1000);
  }

  /* 🟡 Pending counts */
useEffect(() => {
  const fetchPendingCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_posts')
        .select('fan_wall_id')
        .eq('status', 'pending');
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        counts[p.fan_wall_id] = (counts[p.fan_wall_id] || 0) + 1;
      });
      setPendingCounts(counts);
    } catch (err) {
      console.error('❌ Error loading pending counts:', err);
    }
  };

  fetchPendingCounts();

  const channel = supabase
    .channel('guest_posts-pending')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'guest_posts' },
      fetchPendingCounts
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    console.log('❌ Left guest_posts-pending channel');
  };
}, [walls]);

  /* 🖼️ Render grid */
  return (
    <div className={cn('mt-10 w-full max-w-6xl')}>
      <h2 className={cn('text-xl font-semibold mb-3')}>🎤 Fan Zone Walls</h2>
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5')}>
        {(!safeWalls || safeWalls.length === 0) && (
          <p className={cn('text-gray-400 italic')}>No Fan Zone Walls created yet.</p>
        )}

        {safeWalls.map((wall) => (
          <div
            key={wall.id}
            className={cn(
              'rounded-xl p-4 text-center shadow-lg bg-cover bg-center flex flex-col justify-between transition-all duration-500',
              wall.status === 'live'
                ? 'ring-4 ring-lime-400 shadow-lime-500/50'
                : wall.countdown_active
                ? 'ring-4 ring-yellow-400 shadow-yellow-500/50'
                : 'ring-0'
            )}
            style={{
              background:
                wall.background_type === 'image'
                  ? `url(${wall.background_value}) center/cover no-repeat`
                  : wall.background_value || 'linear-gradient(135deg,#0d47a1,#1976d2)',
            }}
          >
            <div>
              <h3 className={cn('font-bold', 'text-lg', 'text-center', 'mb-1')}>
                {wall.host_title || wall.title || 'Untitled Wall'}
              </h3>
              <p className={cn('text-sm', 'mb-2')}>
                <strong>Status:</strong>{' '}
                <span
                  className={
                    wall.status === 'live'
                      ? 'text-lime-400'
                      : wall.countdown_active
                      ? 'text-yellow-400'
                      : 'text-orange-400'
                  }
                >
                  {wall.status === 'live'
                    ? 'LIVE'
                    : wall.countdown_active
                    ? 'COUNTDOWN ACTIVE'
                    : 'INACTIVE'}
                </span>
              </p>
              <div className={cn('flex', 'justify-center', 'mb-3')}>
                <button
                  onClick={() => openModerationPopup(wall.id)}
                  className={`px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1 shadow-md transition ${
                    (pendingCounts[wall.id] || 0) > 0
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      : 'bg-gray-600 hover:bg-gray-700 text-white/80'
                  }`}
                >
                  🕓 Pending
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                      (pendingCounts[wall.id] || 0) > 0
                        ? 'bg-black/70 text-white'
                        : 'bg-white/20 text-gray-300'
                    }`}
                  >
                    {pendingCounts[wall.id] || 0}
                  </span>
                </button>
              </div>
            </div>

            <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mt-auto', 'pt-2', 'border-t', 'border-white/10')}>
              <button onClick={() => handleLaunch(wall.id)} className={cn('bg-blue-600', 'hover:bg-blue-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}>
                🚀 Launch
              </button>
              <button onClick={() => handleStart(wall.id)} className={cn('bg-green-600', 'hover:bg-green-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}>
                ▶️ Play
              </button>
              <button onClick={() => handleStop(wall.id)} className={cn('bg-red-600', 'hover:bg-red-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}>
                ⏹ Stop
              </button>
              <button onClick={() => handleClear(wall.id)} className={cn('bg-cyan-500', 'hover:bg-cyan-600', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}>
                🧹 Clear
              </button>
              <button onClick={() => onOpenOptions(wall)} className={cn('bg-indigo-500', 'hover:bg-indigo-600', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}>
                ⚙ Options
              </button>
              <button onClick={() => handleDelete(wall.id)} className={cn('bg-red-700', 'hover:bg-red-800', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}>
                ❌ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}