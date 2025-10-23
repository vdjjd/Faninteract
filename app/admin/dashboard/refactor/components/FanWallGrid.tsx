'use client';

import { supabase } from '@/lib/supabaseClient';
import { clearEventPosts, deleteEvent } from '@/lib/actions/events';
import GridCard from './GridCard';

interface FanWallGridProps {
  events: any[];
  host: any;
  refreshEvents: () => Promise<void>;
  onOpenOptions: (event: any) => void;
}

export default function FanWallGrid({ events, host, refreshEvents, onOpenOptions }: FanWallGridProps) {
  /* ---------- Launch Wall ---------- */
  async function handleLaunch(id: string) {
    const url = `${window.location.origin}/wall/${id}`;
    const popup = window.open(url, '_blank', 'width=1280,height=800,left=100,top=100');
    popup?.focus();
  }

  /* ---------- Start Wall (with countdown support) ---------- */
  async function handleStart(id: string) {
    const { data: current, error } = await supabase
      .from('events')
      .select('countdown')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching event before start:', error);
      return;
    }

    if (current?.countdown && current.countdown !== 'none') {
      await supabase
        .from('events')
        .update({
          countdown_active: true,
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
    }

    await refreshEvents();
  }

  /* ---------- Stop Wall ---------- */
  async function handleStop(id: string) {
    await supabase
      .from('events')
      .update({
        status: 'inactive',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await refreshEvents();
  }

  /* ---------- Clear Posts ---------- */
  async function handleClear(id: string) {
    await clearEventPosts(id);
    await refreshEvents();
  }

  /* ---------- Delete Wall ---------- */
  async function handleDelete(id: string) {
    await deleteEvent(id);
    await refreshEvents();
  }

  /* ---------- UI ---------- */
  return (
    <div className="mt-10 w-full max-w-6xl">
      <h2 className="text-xl font-semibold mb-3">🎤 Fan Zone Walls</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {events.length === 0 && (
          <p className="text-gray-400 italic">No Fan Zone Walls created yet.</p>
        )}

        {events.map((event) => (
          <div key={event.id} className="relative">
            <GridCard
              id={event.id}
              title={event.title}
              hostTitle={event.host_title}
              status={event.status}
              backgroundType={event.background_type}
              backgroundValue={event.background_value}
              type="fanwall"
              onLaunch={() => handleLaunch(event.id)}
              onStart={() => handleStart(event.id)}
              onStop={() => handleStop(event.id)}
              onClear={() => handleClear(event.id)}
              onDelete={() => handleDelete(event.id)}
            />

            {/* Pending Posts Button (FanWall specific) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <button
                onClick={() => window.open(`/admin/moderation/${event.id}`, '_blank')}
                className={`px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1 shadow-md transition ${
                  event.pending_posts > 0
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    : 'bg-gray-500 text-white/80 cursor-not-allowed'
                }`}
              >
                🕓 Pending
                {event.pending_posts > 0 && (
                  <span className="bg-black/70 text-white px-1.5 py-0.5 rounded-md text-xs font-bold">
                    {event.pending_posts}
                  </span>
                )}
              </button>
            </div>

            {/* Options Button (FanWall specific) */}
            <div className="absolute top-3 right-3">
              <button
                onClick={() => onOpenOptions(event)}
                className="bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold shadow-md"
              >
                ⚙
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
