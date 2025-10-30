'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '../../../../lib/utils';
import { clearFanWallPosts, deleteFanWall } from '@/lib/actions/fan_walls';

interface FanWallGridProps {
  walls: any[];
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
  /* ---------- OPEN WALL ---------- */
  async function handleLaunch(id: string) {
    const url = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      url,
      '_blank',
      'width=1280,height=800,left=100,top=100,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  /* ---------- PLAY ---------- */
  async function handleStart(id: string) {
    try {
      const { data: current, error } = await supabase
        .from('fan_walls')
        .select('countdown')
        .eq('id', id)
        .single();

      if (error) return console.error('❌ Error fetching wall before start:', error);

      if (current?.countdown && current.countdown !== 'none') {
        await supabase
          .from('fan_walls')
          .update({
            countdown_active: true,
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } else {
        await supabase
          .from('fan_walls')
          .update({
            status: 'live',
            countdown_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        supabase.channel('fan_walls-realtime').send({
          type: 'broadcast',
          event: 'wall_status_changed',
          payload: { id, status: 'live' },
        });
      }

      await refreshFanWalls();
    } catch (err) {
      console.error('❌ Error starting wall:', err);
    }
  }

  /* ---------- STOP ---------- */
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

      supabase.channel('fan_walls-realtime').send({
        type: 'broadcast',
        event: 'wall_status_changed',
        payload: { id, status: 'inactive' },
      });

      await refreshFanWalls();
    } catch (err) {
      console.error('❌ Error stopping wall:', err);
    }
  }

  /* ---------- CLEAR ---------- */
  async function handleClear(id: string) {
    await clearFanWallPosts(id);
    await refreshFanWalls();
  }

  /* ---------- DELETE ---------- */
  async function handleDelete(id: string) {
    await deleteFanWall(id);
    await refreshFanWalls();
  }

  /* ---------- MODERATION POPUP ---------- */
  function openModerationPopup(wallId: string) {
    const w = 1280;
    const h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;

    const popup = window.open(
      `/admin/moderation/${wallId}`,
      `moderation_${wallId}`,
      [
        `width=${w}`,
        `height=${h}`,
        `left=${left}`,
        `top=${top}`,
        'resizable=yes',
        'scrollbars=yes',
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no',
        'titlebar=no',
      ].join(',')
    );

    popup?.focus();

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        refreshFanWalls();
      }
    }, 1000);
  }

  /* ---------- REALTIME LISTENER ---------- */
  useEffect(() => {
    const channel = supabase
      .channel('guest_posts-pending')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_posts' },
        async (payload: any) => {
          if (payload?.new && 'fan_wall_id' in payload.new) {
            await refreshFanWalls();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshFanWalls]);

  /* ---------- RENDER ---------- */
  return (
    <div className={cn('mt-10', 'w-full', 'max-w-6xl')}>
      <h2 className={cn('text-xl', 'font-semibold', 'mb-3')}>🎤 Fan Zone Walls</h2>

      <div className={cn('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-5')}>
        {walls.length === 0 && (
          <p className={cn('text-gray-400', 'italic')}>No Fan Zone Walls created yet.</p>
        )}

        {walls.map((wall) => (
          <div
            key={wall.id}
            className={cn('rounded-xl', 'p-4', 'text-center', 'shadow-lg', 'bg-cover', 'bg-center', 'flex', 'flex-col', 'justify-between')}
            style={{
              background:
                wall.background_type === 'image'
                  ? `url(${wall.background_value}) center/cover no-repeat`
                  : wall.background_value || 'linear-gradient(135deg,#0d47a1,#1976d2)',
            }}
          >
            <div>
              <h3 className={cn('font-bold', 'text-lg', 'text-center', 'drop-shadow-md', 'mb-1')}>
                {wall.host_title || wall.title || 'Untitled Wall'}
              </h3>
              <p className={cn('text-sm', 'mb-2')}>
                <strong>Status:</strong>{' '}
                <span
                  className={
                    wall.status === 'live'
                      ? 'text-lime-400'
                      : wall.status === 'inactive'
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }
                >
                  {wall.status}
                </span>
              </p>

              {/* ---------- Pending Button ---------- */}
              <div className={cn('flex', 'justify-center', 'mb-3')}>
                <button
                  onClick={() => openModerationPopup(wall.id)}
                  className={`px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1 shadow-md transition ${
                    wall.pending_posts > 0
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      : 'bg-gray-600 hover:bg-gray-700 text-white/80'
                  }`}
                >
                  🕓 Pending
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                      wall.pending_posts > 0
                        ? 'bg-black/70 text-white'
                        : 'bg-white/20 text-gray-300'
                    }`}
                  >
                    {wall.pending_posts}
                  </span>
                </button>
              </div>
            </div>

            {/* ---------- Control Buttons ---------- */}
            <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mt-auto', 'pt-2', 'border-t', 'border-white/10')}>
              <button
                onClick={() => handleLaunch(wall.id)}
                className={cn('bg-blue-600', 'hover:bg-blue-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                🚀 Launch
              </button>
              <button
                onClick={() => handleStart(wall.id)}
                className={cn('bg-green-600', 'hover:bg-green-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                ▶️ Play
              </button>
              <button
                onClick={() => handleStop(wall.id)}
                className={cn('bg-red-600', 'hover:bg-red-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                ⏹ Stop
              </button>
              <button
                onClick={() => handleClear(wall.id)}
                className={cn('bg-cyan-500', 'hover:bg-cyan-600', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                🧹 Clear
              </button>
              <button
                onClick={() => onOpenOptions(wall)}
                className={cn('bg-indigo-500', 'hover:bg-indigo-600', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                ⚙ Options
              </button>
              <button
                onClick={() => handleDelete(wall.id)}
                className={cn('bg-red-700', 'hover:bg-red-800', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                ❌ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
