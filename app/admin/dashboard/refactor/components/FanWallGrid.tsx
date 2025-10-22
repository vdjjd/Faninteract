'use client';

import GridCard from './GridCard';
import { supabase } from '@/lib/supabaseClient';
import { getEventsByHost, clearEventPosts, deleteEvent } from '@/lib/actions/events';

interface FanWallGridProps {
  events: any[];
  host: any;
  refreshEvents: () => Promise<void>;
}

export default function FanWallGrid({ events, host, refreshEvents }: FanWallGridProps) {
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
          <GridCard
            key={event.id}
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
        ))}
      </div>
    </div>
  );
}
