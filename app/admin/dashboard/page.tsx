'use client';

import { useEffect, useState } from 'react';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
} from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
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
      .update({ status: 'cleared', updated_at: new Date().toISOString() })
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

  async function handleStart(id: string) {
    await supabase
      .from('events')
      .update({ status: 'live', updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function handleStop(id: string) {
    await supabase
      .from('events')
      .update({
        status: 'inactive',
        countdown: null,
        updated_at: new Date().toISOString(),
      })
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
    [card].forEach((el) => {
      if (el) {
        el.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], {
          duration: 1000,
          easing: 'ease-in-out',
        });
        el.style.transition = 'background 2s ease';
        el.style.background = newValue;
      }
    });

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
            }}
          >
            <h3 className="font-bold text-lg">
              {event.host_title || `${event.title} Fan Zone Wall`}
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
              {confirmingDelete === event.id ? (
                <div className="mt-2 bg-black/70 p-2 rounded-md border border-gray-500">
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
                  className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold"
                >
                  ❌ Delete
                </button>
              )}
            </div>

            <div className="flex justify-between mt-3">
              <button
                onClick={() => handleOpenModeration(event.id)}
                className="bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded text-sm font-semibold"
              >
                🔔 Pending ({event.pending_posts ?? 0})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- OPTIONS MODAL ---------- */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
          <div
            className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white animate-fadeIn"
            style={{
              background: selectedEvent.background_value || DEFAULT_GRADIENT,
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

            <label className="block mt-3 text-sm">Countdown:</label>
            <select
              className="w-full p-2 rounded-md text-black mt-1"
              value={selectedEvent.countdown || 'none'}
              onChange={(e) =>
                setSelectedEvent({
                  ...selectedEvent,
                  countdown:
                    e.target.value === 'none' ? null : e.target.value,
                })
              }
            >
              <option value="none">No Countdown</option>
              {['30 Seconds','1 Minute','2 Minutes','3 Minutes','5 Minutes','10 Minutes'].map(
                (opt) => (
                  <option key={opt}>{opt}</option>
                )
              )}
            </select>

            <label className="block mt-3 text-sm">Layout Type:</label>
            <select
              className="w-full p-2 rounded-md text-black mt-1"
              value={selectedEvent.layout_type || 'Single Highlight Post'}
              onChange={(e) =>
                setSelectedEvent({
                  ...selectedEvent,
                  layout_type: e.target.value,
                })
              }
            >
              <option>Single Highlight Post</option>
              <option>2 Column × 2 Row</option>
              <option>4 Column × 2 Row</option>
            </select>

            <label className="block mt-3 text-sm">Post Transition:</label>
            <select
              className="w-full p-2 rounded-md text-black mt-1"
              value={selectedEvent.post_transition || 'Fade In / Fade Out'}
              onChange={(e) =>
                setSelectedEvent({
                  ...selectedEvent,
                  post_transition: e.target.value,
                })
              }
            >
              <option>Fade In / Fade Out</option>
              <option>Slide Up / Slide Out</option>
              <option>Zoom In / Zoom Out</option>
            </select>

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

            <h4 className="mt-4 text-sm font-semibold">🎨 Pick Color</h4>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {[
                '#e53935','#8e24aa','#1e88e5','#43a047','#fdd835','#fb8c00',
                '#f4511e','#00acc1','#7cb342','#3949ab',
              ].map((c) => (
                <div
                  key={c}
                  className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                  style={{ background: c }}
                  onClick={() => handleBackgroundChange(selectedEvent, c)}
                />
              ))}
            </div>

            <div className="text-center mt-5 flex justify-center gap-4">
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await supabase
                    .from('events')
                    .update({
                      host_title: selectedEvent.host_title || '',
                      title: selectedEvent.title || '',
                      countdown: selectedEvent.countdown || null,
                      layout_type: selectedEvent.layout_type || '',
                      post_transition: selectedEvent.post_transition || '',
                      auto_delete_minutes:
                        selectedEvent.auto_delete_minutes ?? 0,
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
