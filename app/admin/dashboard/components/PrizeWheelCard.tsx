'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------
✅ Realtime Broadcast Helper
------------------------------------------------------------ */
async function broadcast(event: string, payload: any) {
  await supabase.channel('prizewheel-realtime').send({
    type: 'broadcast',
    event,
    payload,
  });
}

/* ------------------------------------------------------------
✅ PrizeWheelCard Component
------------------------------------------------------------ */
export default function PrizeWheelCard({
  wheel,
  onOpenOptions,
  onDelete,
  onSpin,
  onOpenModeration,
  onPlay,
  onStop,
}: {
  wheel: any;
  onOpenOptions: (wheel: any) => void;
  onDelete: (id: string) => void;
  onSpin: (id: string) => void;
  onOpenModeration: (wheel: any) => void;
  onPlay: (id: string) => void;
  onStop: (id: string) => void;
}) {
  if (!wheel || !wheel.id) {
    return (
      <div className={cn(
        'rounded-xl p-4 text-center bg-gray-700/20 text-gray-300 border border-white/10'
      )}>
        Loading wheel…
      </div>
    );
  }

  const [entryCount, setEntryCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRemote, setPendingRemote] = useState(false);

  /* ------------------------------------------------------------
   ✅ Load Entry Counts
  ------------------------------------------------------------ */
  async function loadCounts() {
    const { data } = await supabase
      .from('wheel_entries')
      .select('status')
      .eq('wheel_id', wheel.id);

    const all = data || [];
    setEntryCount(all.filter(x => x.status === 'approved').length);
    setPendingCount(all.filter(x => x.status === 'pending').length);
  }

  /* ------------------------------------------------------------
   ✅ Realtime: Entry Counts
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!wheel?.id) return;
    loadCounts();

    const channel = supabase
      .channel(`wheel_entries_${wheel.id}`)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'wheel_entries',
          filter: `wheel_id=eq.${wheel.id}`,
        },
        loadCounts
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [wheel]);

  /* ------------------------------------------------------------
   ✅ Realtime: Remote Spin Listener
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!wheel?.id) return;

    const channel = supabase
      .channel(`prizewheel-${wheel.id}`)
      .on('broadcast', { event: 'spin_trigger' }, () => {
        setPendingRemote(true);
        setTimeout(() => setPendingRemote(false), 3000);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [wheel]);

  /* ------------------------------------------------------------
   ✅ Launch Active Wall Window
  ------------------------------------------------------------ */
  function handleLaunch() {
    const url = `${window.location.origin}/prizewheel/${wheel.id}`;
    const popup = window.open(
      url,
      '_blank',
      'width=1280,height=800,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  /* ------------------------------------------------------------
   ✅ Status Badge
  ------------------------------------------------------------ */
  function StatusBadge() {
    let text = 'INACTIVE';
    let color = 'text-orange-400';

    if (wheel.status === 'live') {
      text = 'LIVE';
      color = 'text-lime-400';
    } else if (wheel.countdown_active) {
      text = 'COUNTDOWN ACTIVE';
      color = 'text-yellow-400';
    }

    return <span className={cn('font-bold tracking-wide', color)}>{text}</span>;
  }

  /* ------------------------------------------------------------
   ✅ Button Actions + Realtime Broadcasts
  ------------------------------------------------------------ */

  async function handlePlay() {
    await onPlay(wheel.id); // existing DB logic
    await broadcast('prizewheel_status_changed', {
      id: wheel.id,
      status: 'live',
    });
  }

  async function handleStop() {
    await onStop(wheel.id); // existing DB logic
    await broadcast('prizewheel_status_changed', {
      id: wheel.id,
      status: 'inactive',
    });
  }

  async function handleSpin() {
    await onSpin(wheel.id);
    await broadcast('spin_trigger', { id: wheel.id });
  }

  /* ------------------------------------------------------------
   ✅ Card UI
  ------------------------------------------------------------ */
  return (
    <div
      className={cn(
        'rounded-xl p-4 text-center shadow-lg bg-cover bg-center flex flex-col justify-between transition-all duration-300',
        wheel.status === 'live'
          ? 'ring-4 ring-lime-400 shadow-lime-500/40'
          : wheel.countdown_active
          ? 'ring-4 ring-yellow-400 shadow-yellow-500/40'
          : 'ring-0'
      )}
      style={{
        background:
          wheel.background_type === 'image'
            ? `url(${wheel.background_value}) center/cover no-repeat`
            : wheel.background_value ||
              'linear-gradient(135deg,#0d47a1,#1976d2)',
      }}
    >
      <div>
        <h3 className={cn('font-bold', 'text-lg', 'mb-1')}>
          {wheel.host_title || wheel.title || 'Untitled Wheel'}
        </h3>

        <p className={cn('text-sm', 'mb-3')}>
          <strong>Status:</strong> <StatusBadge />
        </p>

        {/* Pending button */}
        <div className={cn('flex', 'justify-center', 'mb-3')}>
          <button
            onClick={() => onOpenModeration(wheel)}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1 shadow-md transition',
              pendingCount > 0
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                : 'bg-gray-600 hover:bg-gray-700 text-white/80'
            )}
          >
            🕓 Pending
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-md text-xs font-bold',
                pendingCount > 0
                  ? 'bg-black/70 text-white'
                  : 'bg-white/20 text-gray-300'
              )}
            >
              {pendingCount}
            </span>
          </button>
        </div>

        <p className={cn('text-sm', 'mb-3')}>
          🎟 <strong>{entryCount}</strong> Approved Entrants
        </p>
      </div>

      {/* Button bar */}
      <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mt-auto', 'pt-2', 'border-t', 'border-white/10')}>
        <button onClick={handlePlay} className={cn('px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold', 'bg-yellow-600', 'hover:bg-yellow-700', 'text-black')}>
          ▶ Play
        </button>

        <button onClick={handleStop} className={cn('px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold', 'bg-red-600', 'hover:bg-red-700')}>
          ⏹ Stop
        </button>

        <button onClick={handleLaunch} className={cn('bg-blue-600', 'hover:bg-blue-700', 'px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold')}>
          🚀 Launch
        </button>

        <button
          onClick={handleSpin}
          className={cn(
            'px-3 py-1 rounded text-sm font-semibold transition',
            pendingRemote
              ? 'bg-yellow-500 hover:bg-yellow-600 text-black animate-pulse'
              : 'bg-green-600 hover:bg-green-700 text-white'
          )}
        >
          🎰 Spin Now
        </button>

        <button
          onClick={() => onOpenOptions(wheel)}
          className={cn('bg-indigo-500', 'hover:bg-indigo-600', 'px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
        >
          ⚙ Options
        </button>

        <button
          onClick={() => onDelete(wheel.id)}
          className={cn('bg-red-700', 'hover:bg-red-800', 'px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
        >
          ❌ Delete
        </button>
      </div>
    </div>
  );
}
