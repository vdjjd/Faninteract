'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { clearFanWallPosts, deleteFanWall } from '@/lib/actions/fan_walls';
import { cn } from '../../../../lib/utils';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import ModerationModal from '@/components/ModerationModal';

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
  const channelRef = useRealtimeChannel();
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [localWalls, setLocalWalls] = useState<any[]>(walls || []);
  const [showModeration, setShowModeration] = useState(false);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);

  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalWalls(walls || []);
  }, [walls]);

  /* ✅ Sends commands to wall_commands */
  async function sendWallCommand(wall_id: string, action: string) {
    try {
      await supabase.from("wall_commands").insert([{ wall_id, action }]);
    } catch (err) {
      console.error("❌ sendWallCommand error:", err);
    }
  }

  async function safeBroadcast(event: string, data: any) {
    try {
      const channel = channelRef?.current || supabase.channel('fan_walls-realtime');
      if (!channel) return;

      await channel.send({
        type: 'broadcast',
        event,
        payload: data,
      });
    } catch (err) {
      console.error(err);
    }
  }

  function updateLocalWall(id: string, updates: any) {
    setLocalWalls((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  }

  function handleLaunch(id: string) {
    const url = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      url,
      '_blank',
      'width=1280,height=800,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  async function handleStart(id: string) {
    updateLocalWall(id, { status: 'live', countdown_active: false });

    try {
      const { data: current } = await supabase
        .from('fan_walls')
        .select('countdown')
        .eq('id', id)
        .single();

      if (current?.countdown && current.countdown !== 'none') {
        updateLocalWall(id, { countdown_active: true });

        await supabase
          .from('fan_walls')
          .update({
            countdown_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        await safeBroadcast('wall_updated', { id, countdown_active: true });

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

          await safeBroadcast('countdown_finished', {
            id,
            status: 'live',
          });

          delayedRefresh();
        }, durationMs);
      } else {
        await supabase
          .from('fan_walls')
          .update({
            status: 'live',
            countdown_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        await safeBroadcast('wall_status_changed', {
          id,
          status: 'live',
        });

        delayedRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function parseCountdownDuration(label: string): number {
    const num = parseInt(label);
    if (label.includes('Second')) return num * 1000;
    if (label.includes('Minute')) return num * 60 * 1000;
    return 0;
  }

  async function handleStop(id: string) {
    updateLocalWall(id, {
      status: 'inactive',
      countdown_active: false,
    });

    await supabase
      .from('fan_walls')
      .update({
        status: 'inactive',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await safeBroadcast('wall_status_changed', {
      id,
      status: 'inactive',
    });

    delayedRefresh();
  }

  async function handleClear(id: string) {
    clearFanWallPosts(id).catch(console.error);
    delayedRefresh();
  }

  async function handleDelete(id: string) {
    setLocalWalls((prev) => prev.filter((w) => w.id !== id));
    deleteFanWall(id).catch(console.error);

    await safeBroadcast('wall_status_changed', {
      id,
      status: 'deleted',
    });

    delayedRefresh();
  }

  function openModerationModal(wallId: string) {
    setSelectedWallId(wallId);
    setShowModeration(true);
  }

  function delayedRefresh() {
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);

    refreshTimeout.current = setTimeout(() => {
      refreshFanWalls().catch(console.error);
    }, 500);
  }

  useEffect(() => {
    async function fetchPendingCounts() {
      const { data } = await supabase
        .from('guest_posts')
        .select('fan_wall_id')
        .eq('status', 'pending');

      const counts: Record<string, number> = {};

      data?.forEach((p: any) => {
        counts[p.fan_wall_id] = (counts[p.fan_wall_id] || 0) + 1;
      });

      setPendingCounts(counts);
    }

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
    };
  }, [host?.id]);

  /* ✅ WALL COMMAND BUTTONS */
  async function reloadWall(id: string) {
    await sendWallCommand(id, "reload_wall");
  }

  // ✅ fullscreen REMOVED

  return (
    <div className={cn('mt-10 w-full max-w-6xl')}>
      <h2 className={cn('text-xl font-semibold mb-3')}>🎤 Fan Zone Walls</h2>

      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
        )}
      >
        {(!localWalls || localWalls.length === 0) && (
          <p className={cn('text-gray-400 italic')}>
            No Fan Zone Walls created yet.
          </p>
        )}

        {localWalls.map((wall) => (
          <div
            key={wall.id}
            className={cn(
              'rounded-xl p-4 text-center shadow-lg bg-cover bg-center flex flex-col justify-between transition-all duration-300',
              wall.status === 'live'
                ? 'ring-4 ring-lime-400 shadow-lime-500/50'
                : wall.countdown_active
                ? 'ring-4 ring-yellow-400 shadow-yellow-500/50'
                : 'ring-0'
            )}
            style={{
              backgroundImage:
                wall.background_type === 'image'
                  ? `url(${wall.background_value})`
                  : wall.background_value,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div>
              <h3 className={cn('font-bold text-lg mb-1')}>
                {wall.host_title || wall.title || 'Untitled Wall'}
              </h3>

              <p className={cn('text-sm mb-2')}>
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

              <div className={cn('flex justify-center mb-3')}>
                <button
                  onClick={() => openModerationModal(wall.id)}
                  className={cn(
                    'px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1 shadow-md transition',
                    pendingCounts[wall.id] > 0
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      : 'bg-gray-600 hover:bg-gray-700 text-white/80'
                  )}
                >
                  🕓 Pending
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-md text-xs font-bold',
                      pendingCounts[wall.id] > 0
                        ? 'bg-black/70 text-white'
                        : 'bg-white/20 text-gray-300'
                    )}
                  >
                    {pendingCounts[wall.id] || 0}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={cn(
                'flex flex-wrap justify-center gap-2 mt-auto pt-2 border-t border-white/10'
              )}
            >
              <button
                onClick={() => handleLaunch(wall.id)}
                className={cn(
                  'bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold'
                )}
              >
                🚀 Launch
              </button>
              <button
                onClick={() => handleStart(wall.id)}
                className={cn(
                  'bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm font-semibold'
                )}
              >
                ▶️ Play
              </button>
              <button
                onClick={() => handleStop(wall.id)}
                className={cn(
                  'bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-semibold'
                )}
              >
                ⏹ Stop
              </button>
              <button
                onClick={() => handleClear(wall.id)}
                className={cn(
                  'bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold'
                )}
              >
                🧹 Clear
              </button>
              <button
                onClick={() => onOpenOptions(wall)}
                className={cn(
                  'bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold'
                )}
              >
                ⚙ Options
              </button>
              <button
                onClick={() => handleDelete(wall.id)}
                className={cn(
                  'bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold'
                )}
              >
                ❌ Delete
              </button>

              {/* ✅ Reload only (fullscreen removed) */}
              <button
                onClick={() => reloadWall(wall.id)}
                className={cn(
                  'bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded text-sm font-semibold'
                )}
              >
                🔄 Reload
              </button>

              {/* ❌ Fullscreen button removed */}
            </div>
          </div>
        ))}
      </div>

      {showModeration && selectedWallId && (
        <ModerationModal
          wallId={selectedWallId}
          onClose={() => setShowModeration(false)}
        />
      )}
    </div>
  );
}
