'use client';

import { useEffect, useState } from 'react';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
} from '@/lib/actions/events';
import {
  createPoll,
  getPollsByHost,
  deletePoll,
  clearPoll,
} from '@/lib/actions/polls';
import { supabase } from '@/lib/supabaseClient';
import OptionsModal from '@/components/OptionsModal';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<{ type: string; id: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<'fanwall' | 'poll' | 'trivia' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ---------- LOAD HOST EVENTS + POLLS ---------- */
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setHost(user);

      const [fetchedEvents, fetchedPolls] = await Promise.all([
        getEventsByHost(user.id),
        getPollsByHost(user.id),
      ]);

      setEvents(fetchedEvents);
      setPolls(fetchedPolls);
      setLoading(false);
    }
    fetchData();
  }, []);

  /* ---------- REALTIME REFRESH ---------- */
  useEffect(() => {
    if (!host) return;

    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
        const updatedEvents = await getEventsByHost(host.id);
        setEvents(updatedEvents);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, async () => {
        const updatedPolls = await getPollsByHost(host.id);
        setPolls(updatedPolls);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host]);

  /* ---------- FAN WALL CRUD ---------- */
  async function handleCreateEvent() {
    if (!newTitle.trim()) return;
    await createEvent(host.id, { title: newTitle.trim() });
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
    setCreatingNew(null);
    setNewTitle('');
  }

  async function handleDeleteEvent(id: string) {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setConfirmingDelete(null);
  }

  async function handleClearEvent(id: string) {
    await clearEventPosts(id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  /* ---------- POLL CRUD ---------- */
  async function handleCreatePoll() {
    if (!newTitle.trim()) return;
    await createPoll(host.id, { title: newTitle.trim() });
    const updated = await getPollsByHost(host.id);
    setPolls(updated);
    setCreatingNew(null);
    setNewTitle('');
  }

  async function handleDeletePoll(id: string) {
    await deletePoll(id);
    setPolls((prev) => prev.filter((p) => p.id !== id));
    setConfirmingDelete(null);
  }

  async function handleClearPoll(id: string) {
    await clearPoll(id);
    const updated = await getPollsByHost(host.id);
    setPolls(updated);
  }

  /* ---------- FAN WALL CONTROL ---------- */
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

    await supabase.from('events').update({ ...update, updated_at: new Date().toISOString() }).eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function handleStopWall(id: string) {
    await supabase
      .from('events')
      .update({ status: 'inactive', countdown_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  /* ---------- POLL CONTROL ---------- */
  async function handleLaunchPoll(id: string) {
    const pollUrl = `${window.location.origin}/poll/${id}`;
    const popup = window.open(
      pollUrl,
      '_blank',
      'width=1280,height=800,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no'
    );
    popup?.focus();
  }

  /* ---------- BACKGROUND CHANGE ---------- */
  async function handleBackgroundChange(event: any, newValue: string) {
    try {
      const type =
        newValue.startsWith('linear-gradient') ? 'gradient' :
        newValue.startsWith('#') ? 'solid' : 'image';

      const { error } = await supabase
        .from('events')
        .update({
          background_type: type,
          background_value: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (error) throw error;

      showToast('✅ Background updated successfully!');
      const refreshed = await getEventsByHost(host.id);
      setEvents(refreshed);
    } catch (err) {
      console.error('❌ handleBackgroundChange failed:', err);
      showToast('❌ Failed to update background.');
    }
  }

  /* ---------- TOAST HANDLER ---------- */
  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  /* ---------- PAGE ---------- */
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white">
        <p>Loading…</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white flex flex-col items-center px-4 py-8 font-sans">
      <img
        src="/faninteractlogo.png"
        alt="FanInteract Logo"
        className="w-44 animate-pulse mb-2 drop-shadow-lg"
      />
      <h1 className="text-2xl font-bold mb-6">🎛 Host Dashboard</h1>

      {/* ---------- CREATE BUTTONS ---------- */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setCreatingNew('fanwall')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
        >
          ➕ New Fan Zone Wall
        </button>
        <button
          onClick={() => setCreatingNew('poll')}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
        >
          📊 New Live Poll Wall
        </button>
      </div>

      {/* ---------- FAN WALLS GRID ---------- */}
      <h2 className="text-xl font-semibold mt-8 mb-2">🎤 Fan Zone Walls</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl p-4 text-center shadow-lg bg-cover bg-center"
            style={{
              background:
                event.background_type === 'image'
                  ? `url(${event.background_value}) center/cover no-repeat`
                  : event.background_value || DEFAULT_GRADIENT,
            }}
          >
            <h3 className="font-bold text-lg text-center drop-shadow-md">
              {event.host_title || event.title}
            </h3>
            <p className="text-sm mt-1">
              <strong>Status:</strong>{' '}
              <span
                className={
                  event.status === 'live'
                    ? 'text-lime-400'
                    : event.status === 'cleared'
                    ? 'text-cyan-400'
                    : 'text-orange-400'
                }
              >
                {event.status}
              </span>
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <button onClick={() => handleLaunchWall(event.id)} className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold">
                🚀 Launch
              </button>
              <button onClick={() => handleStartWall(event.id)} className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm font-semibold">
                ▶️ Play
              </button>
              <button onClick={() => handleStopWall(event.id)} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-semibold">
                ⏹ Stop
              </button>
              <button onClick={() => handleClearEvent(event.id)} className="bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold">
                🧹 Clear
              </button>
              <button
                onClick={() => {
                  setSelectedEvent(event);
                  setSelectedType('fanwall');
                }}
                className="bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold"
              >
                ⚙ Options
              </button>
              <button onClick={() => setConfirmingDelete({ type: 'event', id: event.id })} className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold">
                ❌ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- POLL WALLS GRID ---------- */}
      <h2 className="text-xl font-semibold mt-10 mb-2">📊 Live Poll Walls</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {polls.map((poll) => (
          <div
            key={poll.id}
            className="rounded-xl p-4 text-center shadow-lg bg-cover bg-center"
            style={{
              background:
                poll.background_type === 'image'
                  ? `url(${poll.background_value}) center/cover no-repeat`
                  : poll.background_value || DEFAULT_GRADIENT,
            }}
          >
            <h3 className="font-bold text-lg text-center drop-shadow-md">
              {poll.title}
            </h3>
            <p className="text-sm mt-1">
              <strong>Status:</strong>{' '}
              <span
                className={
                  poll.status === 'live'
                    ? 'text-lime-400'
                    : poll.status === 'cleared'
                    ? 'text-cyan-400'
                    : 'text-orange-400'
                }
              >
                {poll.status}
              </span>
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <button onClick={() => handleLaunchPoll(poll.id)} className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold">
                🚀 Launch
              </button>
              <button onClick={() => handleClearPoll(poll.id)} className="bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold">
                🧹 Clear
              </button>
              <button
                onClick={() => {
                  setSelectedEvent(poll);
                  setSelectedType('poll');
                }}
                className="bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold"
              >
                ⚙ Options
              </button>
              <button onClick={() => setConfirmingDelete({ type: 'poll', id: poll.id })} className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold">
                ❌ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- DELETE CONFIRMATION ---------- */}
      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-[#111] border border-gray-500 rounded-xl p-6 text-center text-white shadow-2xl w-80">
            <h3 className="text-xl font-semibold mb-3">Confirm Deletion</h3>
            <p className="text-sm mb-4">Are you sure you want to delete this {confirmingDelete.type}?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() =>
                  confirmingDelete.type === 'poll'
                    ? handleDeletePoll(confirmingDelete.id)
                    : handleDeleteEvent(confirmingDelete.id)
                }
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold"
              >
                ✅ Yes, Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(null)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
              >
                ✖ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- OPTIONS MODAL ---------- */}
      {selectedEvent && selectedType && (
        <OptionsModal
          type={selectedType}
          event={selectedEvent}
          hostId={host.id}
          onClose={() => {
            setSelectedEvent(null);
            setSelectedType(null);
          }}
          onBackgroundChange={handleBackgroundChange}
          refreshEvents={async () => {
            const updated = await getEventsByHost(host.id);
            setEvents(updated);
          }}
        />
      )}

      {/* ---------- TOAST ---------- */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn z-50">
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
