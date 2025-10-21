'use client';

import { useEffect, useState } from 'react';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
} from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';
import OptionsModal from '@/components/OptionsModal';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  /* ---------- LOAD HOST EVENTS ---------- */
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setHost(user);
      const fetched = await getEventsByHost(user.id);
      setEvents(fetched);
      setLoading(false);
    }
    fetchData();
  }, []);

  /* ---------- REALTIME REFRESH ---------- */
  useEffect(() => {
    if (!host) return;
    const channel = supabase
      .channel('events_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        async () => {
          const updated = await getEventsByHost(host.id);
          setEvents(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host]);

  /* ---------- CRUD ---------- */
  async function handleCreateConfirm() {
    if (!newTitle.trim()) return;
    await createEvent(host.id, { title: newTitle.trim() });
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
    setCreatingNew(false);
    setNewTitle('');
  }

  async function handleDelete(id: string) {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setConfirmingDelete(null);
  }

  async function handleClear(id: string) {
    await clearEventPosts(id);
    await supabase
      .from('events')
      .update({
        status: 'cleared',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function handleLaunch(id: string) {
    const wallUrl = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      wallUrl,
      '_blank',
      'popup=yes,width=1280,height=800,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no,titlebar=no'
    );
    popup?.focus();
  }

  /* ---------- PLAY BUTTON ---------- */
  async function handleStart(id: string) {
    const { data: event } = await supabase.from('events').select('*').eq('id', id).single();

    if (!event) return;

    // If countdown exists, start it — do not instantly go live
    if (event.countdown) {
      await supabase
        .from('events')
        .update({
          countdown_active: true,
          status: 'inactive', // stays inactive until timer hits 0
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } else {
      // No countdown selected — go live immediately
      await supabase
        .from('events')
        .update({
          status: 'live',
          countdown_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  /* ---------- STOP BUTTON ---------- */
  async function handleStop(id: string) {
    const { data: event } = await supabase.from('events').select('*').eq('id', id).single();
    if (!event) return;

    await supabase
      .from('events')
      .update({
        status: 'inactive',
        countdown_active: false, // stop timer
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  /* ---------- MODERATION WINDOW ---------- */
  function handleOpenModeration(id: string) {
    const modUrl = `${window.location.origin}/admin/moderation/${id}`;
    window.open(
      modUrl,
      '_blank',
      'width=1200,height=700,left=200,top=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
  }

  /* ---------- BACKGROUND CHANGE ---------- */
  async function handleBackgroundChange(event: any, newValue: string) {
    const card = document.getElementById(`card-${event.id}`);
    if (card) {
      card.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], {
        duration: 1000,
        easing: 'ease-in-out',
      });
      card.style.transition = 'background 1s ease';
      card.style.background = newValue;
    }

    await supabase
      .from('events')
      .update({
        background_value: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);

    const refreshed = await getEventsByHost(host.id);
    setEvents(refreshed);
  }

  async function refreshEvents() {
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  /* ---------- LOADING ---------- */
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white">
        <p>Loading…</p>
      </div>
    );

  /* ---------- PAGE ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white flex flex-col items-center px-4 py-8 font-sans">
      <img
        src="/faninteractlogo.png"
        alt="FanInteract Logo"
        className="w-44 animate-pulse mb-2 drop-shadow-lg"
      />
      <h1 className="text-2xl font-bold mb-6">🎛 Host Dashboard</h1>

      {/* ---------- CREATE NEW ---------- */}
      {!creatingNew ? (
        <button
          onClick={() => setCreatingNew(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
        >
          ➕ New Fan Zone Wall
        </button>
      ) : (
        <div className="bg-black/40 border border-blue-500/50 rounded-xl p-4 mt-4 w-72 text-center backdrop-blur-md">
          <h3 className="font-semibold text-lg mb-2">🆕 Create New Fan Wall</h3>
          <input
            type="text"
            placeholder="Enter title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full p-2 rounded-md text-black"
          />
          <div className="flex justify-center gap-3 mt-3">
            <button
              onClick={handleCreateConfirm}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
            >
              💾 Create
            </button>
            <button
              onClick={() => setCreatingNew(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              ✖ Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---------- EVENTS GRID ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8">
        {events.map((event) => (
          <div
            key={event.id}
            id={`card-${event.id}`}
            className="rounded-xl p-4 text-center text-white shadow-lg transition-all"
            style={{
              background: event.background_value || DEFAULT_GRADIENT,
            }}
          >
            <h3 className="font-bold text-lg text-center">
              {event.host_title || event.title}
            </h3>
            <p className="text-sm mt-1 text-center">
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

            <div className="flex justify-center mt-2">
              <button
                onClick={() => handleOpenModeration(event.id)}
                className="bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded text-sm font-semibold"
              >
                🔔 Pending ({event.pending_posts ?? 0})
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
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
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <button
                onClick={() => handleClear(event.id)}
                className="bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold"
              >
                🧹 Clear
              </button>
              <button
                onClick={() => setSelectedEvent(event)}
                className="bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold"
              >
                ⚙ Options
              </button>
              <button
                onClick={() => setConfirmingDelete(event.id)}
                className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold"
              >
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
            <p className="text-sm mb-4">
              Are you sure you want to delete this event?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleDelete(confirmingDelete)}
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
      {selectedEvent && (
        <OptionsModal
          event={selectedEvent}
          hostId={host.id}
          onClose={() => setSelectedEvent(null)}
          onBackgroundChange={handleBackgroundChange}
          refreshEvents={refreshEvents}
        />
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
