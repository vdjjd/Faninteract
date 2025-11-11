'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------
✅ Realtime Broadcasts
------------------------------------------------------------ */
async function broadcastSpin(id: string) {
  await supabase.channel(`prizewheel-${id}`).send({
    type: 'broadcast',
    event: 'spin_trigger',
    payload: { id },
  });
}

async function broadcastRemoteSelection(wheelId: string, guestId: string) {
  await supabase.channel(`prizewheel-${wheelId}`).send({
    type: 'broadcast',
    event: 'remote_spin_selected',
    payload: { guestId },
  });
}

export default function PrizeWheelCard({
  wheel,
  onOpenOptions,
  onDelete,
  onSpin,
  onOpenModeration,
  onPlay,
  onStop,
}) {
  if (!wheel || !wheel.id) {
    return (
      <div
        className={cn(
          'rounded-xl p-4 text-center bg-gray-700/20 text-gray-300 border border-white/10'
        )}
      >
        Loading wheel…
      </div>
    );
  }

  const [entryCount, setEntryCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRemote, setPendingRemote] = useState(false);

  const [toggleRemote, setToggleRemote] = useState(
    wheel.remote_spin_enabled ?? false
  );
  const [selectedSpinner, setSelectedSpinner] = useState(
    wheel.selected_remote_spinner ?? null
  );

  /* ------------------------------------------------------------
   ✅ Load Entry Counts
  ------------------------------------------------------------ */
  async function loadCounts() {
    const { data } = await supabase
      .from('wheel_entries')
      .select('status')
      .eq('wheel_id', wheel.id);

    const all = data || [];
    setEntryCount(all.filter((x) => x.status === 'approved').length);
    setPendingCount(all.filter((x) => x.status === 'pending').length);
  }

  /* ------------------------------------------------------------
   ✅ Listen for DB updates
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!wheel) return;
    loadCounts();

    const channel = supabase
      .channel(`wheel_entries_live_${wheel.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wheel_entries',
          filter: `wheel_id=eq.${wheel.id}`,
        },
        () => loadCounts()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [wheel]);

  /* ------------------------------------------------------------
   ✅ Listen for SPIN broadcast (host pressed Spin)
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
  }, [wheel?.id]);

  /* ------------------------------------------------------------
   ✅ HANDLE REMOTE SPIN MODE TOGGLE
  ------------------------------------------------------------ */
  async function handleRemoteToggle() {
    const newState = !toggleRemote;
    setToggleRemote(newState);

    await supabase
      .from('prize_wheels')
      .update({
        remote_spin_enabled: newState,
        selected_remote_spinner: null,
      })
      .eq('id', wheel.id);

    setSelectedSpinner(null);
  }

  /* ------------------------------------------------------------
   ✅ PICK RANDOM APPROVED GUEST
  ------------------------------------------------------------ */
  async function pickRandomSpinner() {
    const { data } = await supabase
      .from('wheel_entries')
      .select('guest_profile_id')
      .eq('wheel_id', wheel.id)
      .eq('status', 'approved');

    if (!data || data.length === 0) {
      alert("No approved entrants yet.");
      return;
    }

    const random = data[Math.floor(Math.random() * data.length)];
    const guestId = random.guest_profile_id;

    setSelectedSpinner(guestId);

    // ✅ Update database
    await supabase
      .from('prize_wheels')
      .update({ selected_remote_spinner: guestId })
      .eq('id', wheel.id);

    // ✅ Broadcast to chosen guest
    await broadcastRemoteSelection(wheel.id, guestId);
  }

  /* ------------------------------------------------------------
   ✅ Basic Wheel Controls
  ------------------------------------------------------------ */
  function handleLaunch() {
    const url = `${window.location.origin}/prizewheel/${wheel.id}`;
    const popup = window.open(
      url,
      '_blank',
      'width=1280,height=800,resizable=yes,scrollbars=yes'
    );

    popup?.focus();
    (window)._activePrizeWheel = popup;
  }

  function StatusBadge() {
    let text = 'INACTIVE';
    let color = 'text-orange-400';

    if (wheel.status === 'live') {
      text = 'LIVE';
      color = 'text-lime-400';
    } else if (wheel.countdown_active) {
      text = 'COUNTDOWN';
      color = 'text-yellow-400';
    }

    return <span className={cn('font-bold tracking-wide', color)}>{text}</span>;
  }

  async function handlePlay() {
    await onPlay(wheel.id);

    if (wheel.countdown && wheel.countdown !== 'none') {
      await supabase
        .from('prize_wheels')
        .update({ countdown_active: true })
        .eq('id', wheel.id);

      return;
    }

    await supabase
      .from('prize_wheels')
      .update({ status: 'live', countdown_active: false })
      .eq('id', wheel.id);
  }

  async function handleStop() {
    await onStop(wheel.id);

    if (wheel.status === 'live') {
      await supabase
        .from('prize_wheels')
        .update({
          status: 'inactive',
          countdown_active: false,
          countdown: 'none',
          selected_remote_spinner: null,
          remote_spin_enabled: false,
        })
        .eq('id', wheel.id);

      setSelectedSpinner(null);
      setToggleRemote(false);
    }
  }

  async function handleSpin() {
    await onSpin(wheel.id);

    try {
      const popup = (window)._activePrizeWheel;
      if (
        popup &&
        popup.window &&
        popup.window._prizewheel?._spin?.start
      ) {
        popup.window._prizewheel._spin.start();
      }
    } catch {}

    await broadcastSpin(wheel.id);
  }

  /* ------------------------------------------------------------
   ✅ RENDER CARD
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
      {/* TITLE AND STATUS */}
      <div>
        <h3 className={cn('font-bold', 'text-lg', 'mb-1')}>
          {wheel.host_title || wheel.title || 'Untitled Wheel'}
        </h3>

        <p className={cn('text-sm', 'mb-3')}>
          <strong>Status:</strong> <StatusBadge />
        </p>

        {/* PENDING BUTTON */}
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

        {/* APPROVED COUNT */}
        <p className={cn('text-sm', 'mb-3')}>
          🎟 <strong>{entryCount}</strong> Approved Entrants
        </p>
      </div>

      {/* CONTROLS */}
      <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mt-auto', 'pt-2', 'border-t', 'border-white/10')}>
        
        {/* ✅ REMOTE SPIN TOGGLE */}
        <div
          onClick={handleRemoteToggle}
          className={cn(
            'relative w-14 h-7 rounded-full cursor-pointer transition-all',
            toggleRemote
              ? 'bg-green-500 shadow-[0_0_12px_rgba(0,255,128,0.6)]'
              : 'bg-gray-600'
          )}
        >
          <span
            className={cn(
              'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-all',
              toggleRemote ? 'translate-x-7' : ''
            )}
          />
        </div>

        {/* ✅ RANDOM SPINNER BUTTON */}
        <button
          disabled={!toggleRemote}
          onClick={pickRandomSpinner}
          className={cn(
            'px-3 py-1 rounded text-sm font-semibold transition',
            toggleRemote
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          )}
        >
          🎯 Pick Random Spinner
        </button>

        {/* PLAY / STOP / LAUNCH / SPIN */}
        <button
          onClick={handlePlay}
          className={cn('px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold', 'bg-yellow-600', 'hover:bg-yellow-700', 'text-black')}
        >
          ▶ Play
        </button>

        <button
          onClick={handleStop}
          className={cn('px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold', 'bg-red-600', 'hover:bg-red-700')}
        >
          ⏹ Stop
        </button>

        <button
          onClick={handleLaunch}
          className={cn('bg-blue-600', 'hover:bg-blue-700', 'px-3', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
        >
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
