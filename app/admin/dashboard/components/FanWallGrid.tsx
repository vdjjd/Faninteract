'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { clearEventPosts, deleteEvent } from '@/lib/actions/events';

interface FanWallGridProps {
  events: any[];
  host: any;
  refreshEvents: () => Promise<void>;
  onOpenOptions: (event: any) => void;
}

export default function FanWallGrid({
  events,
  host,
  refreshEvents,
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
        .from('events')
        .select('countdown')
        .eq('id', id)
        .single();

      if (error) return console.error('❌ Error fetching event before start:', error);

      if (current?.countdown && current.countdown !== 'none') {
        await supabase
          .from('events')
          .update({
            countdown_active: true,
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } else {
        await supabase
          .from('events')
          .update({
            status: 'live',
            countdown_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        supabase.channel('events-realtime').send({
          type: 'broadcast',
          event: 'event_status_changed',
          payload: { id, status: 'live' },
        });
      }

      await refreshEvents();
    } catch (err) {
      console.error('❌ Error starting wall:', err);
    }
  }

  /* ---------- STOP ---------- */
  async function handleStop(id: string) {
    try {
      await supabase
        .from('events')
        .update({
          status: 'inactive',
          countdown_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      supabase.channel('events-realtime').send({
        type: 'broadcast',
        event: 'event_status_changed',
        payload: { id, status: 'inactive' },
      });

      await refreshEvents();
    } catch (err) {
      console.error('❌ Error stopping wall:', err);
    }
  }

  /* ---------- CLEAR ---------- */
  async function handleClear(id: string) {
    await clearEventPosts(id);
    await refreshEvents();
  }

  /* ---------- DELETE ---------- */
  async function handleDelete(id: string) {
    await deleteEvent(id);
    await refreshEvents();
  }

  /* ---------- MODERATION POPUP (NO URL BAR) ---------- */
  function openModerationPopup(eventId: string) {
    const w = 1280;
    const h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;

    const popup = window.open(
      `/admin/moderation/${eventId}`,
      `moderation_${eventId}`, // unique name per wall
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
        'titlebar=no'
      ].join(',')
    );

    popup?.focus();

    // ✅ Auto-refresh dashboard when popup closes
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        refreshEvents();
      }
    }, 1000);
  }

  /* ---------- SUBSCRIBE TO REALTIME PENDING UPDATES ---------- */
  useEffect(() => {
    const channel = supabase
      .channel('submissions-pending')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        async (payload: any) => {
          if (payload?.new && 'event_id' in payload.new) {
            await refreshEvents();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshEvents]);

  /* ---------- RENDER ---------- */
  return (
    <div className="mt-10 w-full max-w-6xl">
      <h2 className="text-xl font-semibold mb-3">🎤 Fan Zone Walls</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {events.length === 0 && (
          <p className="text-gray-400 italic">No Fan Zone Walls created yet.</p>
        )}

        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl p-4 text-center shadow-lg bg-cover bg-center flex flex-col justify-between"
            style={{
              background:
                event.background_type === 'image'
                  ? `url(${event.background_value}) center/cover no-repeat`
                  : event.background_value ||
                    'linear-gradient(135deg,#0d47a1,#1976d2)',
            }}
          >
            <div>
              <h3 className="font-bold text-lg text-center drop-shadow-md mb-1">
                {event.host_title || event.title || 'Untitled Wall'}
              </h3>
              <p className="text-sm mb-2">
                <strong>Status:</strong>{' '}
                <span
                  className={
                    event.status === 'live'
                      ? 'text-lime-400'
                      : event.status === 'inactive'
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }
                >
                  {event.status}
                </span>
              </p>

              {/* ---------- Pending Button ---------- */}
              <div className="flex justify-center mb-3">
                <button
                  onClick={() => openModerationPopup(event.id)}
                  className={`px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1 shadow-md transition ${
                    event.pending_posts > 0
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                      : 'bg-gray-600 hover:bg-gray-700 text-white/80'
                  }`}
                >
                  🕓 Pending
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                      event.pending_posts > 0
                        ? 'bg-black/70 text-white'
                        : 'bg-white/20 text-gray-300'
                    }`}
                  >
                    {event.pending_posts}
                  </span>
                </button>
              </div>
            </div>

            {/* ---------- Control Buttons ---------- */}
            <div className="flex flex-wrap justify-center gap-2 mt-auto pt-2 border-t border-white/10">
              <button
                onClick={() => handleLaunch(event.id)}
                className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold"
              >
                🚀 Launch
              </button>
              <button
                onClick={() => handleStart(event.id)}
                className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm font-semibold"
              >
                ▶️ Play
              </button>
              <button
                onClick={() => handleStop(event.id)}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-semibold"
              >
                ⏹ Stop
              </button>
              <button
                onClick={() => handleClear(event.id)}
                className="bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold"
              >
                🧹 Clear
              </button>
              <button
                onClick={() => onOpenOptions(event)}
                className="bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold"
              >
                ⚙ Options
              </button>
              <button
                onClick={() => handleDelete(event.id)}
                className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold"
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