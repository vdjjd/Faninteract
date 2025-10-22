'use client';

import { supabase } from '@/lib/supabaseClient';
import { clearEventPosts, deleteEvent } from '@/lib/actions/events';

interface FanWallGridProps {
  events: any[];
  host: any;
  refreshEvents: () => Promise<void>;
  onOpenOptions?: (event: any) => void;
}

export default function FanWallGrid({
  events,
  host,
  refreshEvents,
  onOpenOptions,
}: FanWallGridProps) {
  if (!events?.length) {
    return (
      <div className="mt-10 text-center text-gray-400">
        <p>No Fan Zone Walls created yet.</p>
      </div>
    );
  }

  /* ---------- CONTROLS ---------- */
  async function handleLaunchWall(id: string) {
    const wallUrl = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      wallUrl,
      '_blank',
      'width=1280,height=800,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no'
    );
    popup?.focus();
  }

  async function handleStartWall(id: string) {
    const { data: event } = await supabase.from('events').select('*').eq('id', id).single();
    if (!event) return;

    const update = event.countdown
      ? { countdown_active: true, status: 'inactive' }
      : { status: 'live', countdown_active: false };

    await supabase
      .from('events')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', id);

    await refreshEvents();
  }

  async function handleStopWall(id: string) {
    await supabase
      .from('events')
      .update({ status: 'inactive', countdown_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    await refreshEvents();
  }

  async function handleClearWall(id: string) {
    await clearEventPosts(id);
    await refreshEvents();
  }

  async function handleDeleteWall(id: string) {
    await deleteEvent(id);
    await refreshEvents();
  }

  /* ---------- UI ---------- */
  return (
    <div className="w-full mt-10">
      <h2 className="text-xl font-semibold mb-3 text-center">🎤 Fan Zone Walls</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {events.map((event) => {
          const hasPending = event.pending_posts > 0;

          return (
            <div
              key={event.id}
              className={`rounded-xl p-4 text-center shadow-lg bg-cover bg-center border transition-all duration-300 ${
                hasPending
                  ? 'border-yellow-400 shadow-yellow-400/30 animate-pulse-slow'
                  : 'border-transparent'
              }`}
              style={{
                background:
                  event.background_type === 'image'
                    ? `url(${event.background_value}) center/cover no-repeat`
                    : event.background_value || 'linear-gradient(135deg,#0d47a1,#1976d2)',
              }}
            >
              {/* ---- TITLE ---- */}
              <h3 className="font-bold text-lg text-center drop-shadow-md">
                {event.host_title || event.title || 'Untitled Wall'}
              </h3>

              {/* ---- STATUS ---- */}
              <p className="text-sm mt-1 mb-2">
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

              {/* ---- PENDING BUTTON ---- */}
              <div className="flex justify-center mt-1 mb-3">
                <button
                  onClick={() => window.open(`/admin/moderation/${event.id}`, '_blank')}
                  className={`${
                    hasPending
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black font-bold'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  } px-3 py-1 rounded-md text-sm flex items-center gap-1 shadow-md`}
                >
                  🕓 Pending
                  {hasPending && (
                    <span className="bg-black/70 text-white px-1.5 py-0.5 rounded-md text-xs font-bold">
                      {event.pending_posts}
                    </span>
                  )}
                </button>
              </div>

              {/* ---- CONTROL BUTTONS ---- */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <button
                  onClick={() => handleLaunchWall(event.id)}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  🚀 Launch
                </button>
                <button
                  onClick={() => handleStartWall(event.id)}
                  className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  ▶️ Play
                </button>
                <button
                  onClick={() => handleStopWall(event.id)}
                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  ⏹ Stop
                </button>
                <button
                  onClick={() => handleClearWall(event.id)}
                  className="bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold"
                >
                  🧹 Clear
                </button>
                <button
                  onClick={() => onOpenOptions && onOpenOptions(event)}
                  className="bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold"
                >
                  ⚙ Options
                </button>
                <button
                  onClick={() => handleDeleteWall(event.id)}
                  className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold"
                >
                  ❌ Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- ANIMATIONS ---- */}
      <style jsx>{`
        @keyframes pulseSlow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(255, 221, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(255, 221, 0, 0.6);
          }
        }
        .animate-pulse-slow {
          animation: pulseSlow 2.5s infinite;
        }
      `}</style>
    </div>
  );
}
