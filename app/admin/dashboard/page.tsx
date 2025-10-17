'use client';

import { useEffect, useState } from 'react';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
} from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0a2540,#1b2b44)';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

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
      .channel('submissions_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        async () => {
          const updated = await getEventsByHost(host.id);
          setEvents(updated);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    await supabase.from('events')
      .update({ status: 'cleared', updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function handleLaunch(id: string) {
    const wallUrl = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      wallUrl, '_blank',
      'popup=yes,width=1280,height=800,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no,titlebar=no'
    );
    popup?.focus();
  }

  async function handleStart(id: string) {
    await supabase.from('events')
      .update({ status: 'live', updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function handleStop(id: string) {
    await supabase.from('events')
      .update({ status: 'inactive', countdown: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  function handleOpenModeration(id: string) {
    const modUrl = `${window.location.origin}/admin/moderation/${id}`;
    window.open(
      modUrl,
      '_blank',
      'width=1200,height=700,left=200,top=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
  }

  async function handleBackgroundChange(event: any, newValue: string) {
    const card = document.getElementById(`card-${event.id}`);
    if (card) {
      card.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 800 });
      card.style.transition = 'background 1s ease';
      card.style.background = newValue;
    }
    await supabase.from('events')
      .update({ background_value: newValue, updated_at: new Date().toISOString() })
      .eq('id', event.id);
    const refreshed = await getEventsByHost(host.id);
    setEvents(refreshed);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white flex flex-col items-center px-4 py-8 font-sans">
      <img
        src="/faninteractlogo.png"
        alt="FanInteract Logo"
        className="w-44 animate-pulse mb-2 drop-shadow-lg"
      />
      <h1 className="text-2xl font-bold mb-6">🎛 Host Dashboard</h1>

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
              boxShadow: '0 0 20px rgba(0,0,0,0.4)',
            }}
          >
            {/* Title */}
            <h3 className="font-bold text-xl text-center mb-1"
              style={{ textShadow: '0 0 12px rgba(56,189,248,0.4)' }}>
              {event.host_title || event.title}
            </h3>

            {/* Status */}
            <p className="text-sm text-center mb-3"
              style={{ textShadow: '0 0 8px rgba(0,0,0,0.6)' }}>
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

            {/* Pending */}
            <div className="flex justify-center mb-3">
              <button
                onClick={() => handleOpenModeration(event.id)}
                className={`px-3 py-1 rounded text-sm font-semibold shadow-md ${
                  (event.pending_posts ?? 0) > 0
                    ? 'bg-yellow-500 hover:bg-yellow-400 animate-pulse'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                🔔 Pending ({event.pending_posts ?? 0})
              </button>
            </div>

            {/* Launch / Play / Stop */}
            <div className="flex justify-center flex-wrap gap-2 mb-3">
              <button
                onClick={() => handleLaunch(event.id)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-semibold"
              >
                🚀 Launch
              </button>
              <button
                onClick={() => handleStart(event.id)}
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-semibold"
              >
                ▶️ Play
              </button>
              <button
                onClick={() => handleStop(event.id)}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-semibold"
              >
                ⏹ Stop
              </button>
            </div>

            {/* Clear / Options / Delete */}
            <div className="flex justify-center flex-wrap gap-2">
              <button
                onClick={() => handleClear(event.id)}
                className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1 rounded text-sm font-semibold"
              >
                🧹 Clear
              </button>

              <button
                onClick={() => setSelectedEvent(event)}
                className="bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded text-sm font-semibold"
              >
                ⚙ Options
              </button>

              {confirmingDelete === event.id ? (
                <div className="bg-black/70 p-2 rounded-md border border-gray-500 text-sm">
                  <p>Confirm delete?</p>
                  <div className="flex gap-2 mt-2 justify-center">
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="bg-green-600 px-2 py-1 rounded"
                    >
                      ✅ Confirm
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(null)}
                      className="bg-red-600 px-2 py-1 rounded"
                    >
                      ✖ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(event.id)}
                  className="bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm font-semibold"
                >
                  ❌ Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- OPTIONS MODAL ---------- */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md animate-fadeIn">
          <div
            className="border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white"
            style={{
              background: selectedEvent.background_value || DEFAULT_GRADIENT,
              boxShadow: '0 0 25px rgba(56,189,248,0.4)',
            }}
          >
            <h3 className="text-center text-xl font-bold mb-3">
              ⚙ Edit Wall Settings
            </h3>

            <label className="block mt-2 text-sm">Host Title:</label>
            <input
              type="text"
              value={selectedEvent.host_title || ''}
              onChange={(e) =>
                setSelectedEvent({ ...selectedEvent, host_title: e.target.value })
              }
              className="w-full p-2 rounded-md text-black mt-1"
            />

            <label className="block mt-3 text-sm">Public Title:</label>
            <input
              type="text"
              value={selectedEvent.title || ''}
              onChange={(e) =>
                setSelectedEvent({ ...selectedEvent, title: e.target.value })
              }
              className="w-full p-2 rounded-md text-black mt-1"
            />

            <label className="block mt-3 text-sm">Auto Delete Posts After:</label>
            <select
              className="w-full p-2 rounded-md text-black mt-1"
              value={selectedEvent.auto_delete_minutes ?? 0}
              onChange={(e) =>
                setSelectedEvent({
                  ...selectedEvent,
                  auto_delete_minutes: parseInt(e.target.value),
                })
              }
            >
              <option value={0}>Never</option>
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes</option>
              <option value={30}>30 Minutes</option>
            </select>

            {/* 🎨 Gradient grid */}
            <h4 className="mt-4 text-sm font-semibold">🎨 Pick Gradient</h4>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {[
                'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
                'linear-gradient(135deg,#00338D,#C60C30)',
                'linear-gradient(135deg,#203731,#FFB612)',
                'linear-gradient(135deg,#03202F,#FB4F14)',
                'linear-gradient(135deg,#004C54,#A5ACAF)',
                'linear-gradient(135deg,#1E3A8A,#2563EB)',
                'linear-gradient(135deg,#241773,#9E7C0C)',
                'linear-gradient(135deg,#111B2E,#1E90FF)',
                'linear-gradient(135deg,#1b2b44,#69BE28)',
                'linear-gradient(135deg,#0B2265,#A71930)',
              ].map((g) => (
                <div
                  key={g}
                  className="w-6 h-6 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                  style={{ background: g }}
                  onClick={() => handleBackgroundChange(selectedEvent, g)}
                />
              ))}
            </div>

            <div className="text-center mt-5 flex justify-center gap-4">
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await supabase.from('events')
                    .update({
                      host_title: selectedEvent.host_title || '',
                      title: selectedEvent.title || '',
                      auto_delete_minutes: selectedEvent.auto_delete_minutes ?? 0,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', selectedEvent.id);
                  const refreshed = await getEventsByHost(host.id);
                  setEvents(refreshed);
                  setSaving(false);
                  setSelectedEvent(null);
                }}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
              >
                {saving ? 'Saving…' : '💾 Save'}
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
              >
                ✖ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
