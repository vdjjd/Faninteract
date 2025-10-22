'use client';

import GridCard from './GridCard';
import { supabase } from '@/lib/supabaseClient';
import { clearEventPosts, deleteEvent } from '@/lib/actions/events';

interface FanWallGridProps {
  events: any[];
  host: any;
  refreshEvents: () => Promise<void>;
  onOpenOptions?: (event: any) => void; // 👈 Added for Options button
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
              onLaunch={handleLaunchWall}
              onStart={handleStartWall}
              onStop={handleStopWall}
              onClear={handleClearWall}
              onDelete={handleDeleteWall}
            />

            {/* ---------- Pending Button ---------- */}
            <div className="absolute bottom-3 left-3 flex justify-center">
              <button
                onClick={() => window.open(`/admin/moderation/${event.id}`, '_blank')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1 shadow-md"
              >
                🕓 Pending
                {event.pending_posts > 0 && (
                  <span className="bg-black/70 text-white px-1.5 py-0.5 rounded-md text-xs font-bold">
                    {event.pending_posts}
                  </span>
                )}
              </button>
            </div>

            {/* ---------- Options Button ---------- */}
            <div className="absolute bottom-3 right-3">
              <button
                onClick={() => onOpenOptions && onOpenOptions(event)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-sm font-semibold shadow-md"
              >
                ⚙ Options
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
