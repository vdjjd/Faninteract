'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
  updateEventSettings,
} from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';

/* ---------- BASE COLORS ---------- */
const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
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
    return () => supabase.removeChannel(channel);
  }, [host]);

  /* ---------- CRUD HANDLERS (unchanged) ---------- */
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
    setEvents(prev => prev.filter(e => e.id !== id));
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
      wallUrl,
      '_blank',
      'popup=yes,width=1280,height=800,left=100,top=100'
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

  if (loading) return <p className="text-white text-center mt-20">Loading...</p>;

  /* ---------- RENDER ---------- */
  return (
    <main className="relative flex flex-col items-center min-h-screen text-white font-[system-ui] overflow-hidden">
      {/* 🌌 Animated gradient background */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a2540,#1b2b44,#000000)] bg-[length:200%_200%] animate-gradient-slow" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,rgba(0,153,255,0.4),transparent_70%)]" />

      {/* 🧠 Dashboard Header */}
      <div className="relative z-10 flex flex-col items-center mt-10 mb-6">
        <motion.img
          src="/faninteractlogo.png"
          alt="FanInteract Logo"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[280px] md:w-[360px] mb-4 drop-shadow-[0_0_35px_rgba(56,189,248,0.3)]"
        />
        <h1 className="text-4xl font-bold text-sky-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.25)]">
          Host Dashboard
        </h1>
      </div>

      {/* ➕ Create new event */}
      {!creatingNew ? (
        <button
          onClick={() => setCreatingNew(true)}
          className="relative z-10 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform duration-300"
        >
          ➕ New Fan Zone Wall
        </button>
      ) : (
        <div className="relative z-10 mt-4 bg-[#0d1625]/90 p-5 rounded-xl border border-blue-900/40 shadow-lg text-center backdrop-blur-lg">
          <h3 className="text-xl font-semibold mb-2 text-sky-400">🆕 Create New Fan Zone Wall</h3>
          <input
            type="text"
            placeholder="Enter a title for your new wall"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="px-3 py-2 w-72 rounded-md bg-[#111b2f] border border-blue-900/40 text-white focus:ring-2 focus:ring-sky-500"
          />
          <div className="flex justify-center gap-3 mt-3">
            <button onClick={handleCreateConfirm} className="px-4 py-2 bg-green-600 rounded-md">💾 Create</button>
            <button onClick={() => setCreatingNew(false)} className="px-4 py-2 bg-red-700 rounded-md">✖ Cancel</button>
          </div>
        </div>
      )}

      {/* 🎛 Event Grid */}
      <div className="relative z-10 mt-8 grid gap-6 px-4 max-w-6xl w-full sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {events.map((event) => (
          <motion.div
            key={event.id}
            id={`card-${event.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-4 text-center text-white border border-blue-900/40 shadow-md shadow-black/30 hover:scale-[1.02] transition-transform duration-300 backdrop-blur-sm"
            style={{ background: event.background_value || DEFAULT_GRADIENT }}
          >
            <h3 className="text-lg font-semibold mb-1">{event.host_title || `${event.title} Wall`}</h3>
            <p className="text-sm mb-3">
              <strong>Status:</strong>{' '}
              <span className={event.status === 'live' ? 'text-lime-400' : event.status === 'cleared' ? 'text-cyan-300' : 'text-orange-400'}>
                {event.status}
              </span>
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-2">
              <button onClick={() => handleLaunch(event.id)} className="bg-sky-500/80 px-3 py-1 rounded-md hover:bg-sky-500">🚀 Launch</button>
              <button onClick={() => handleStart(event.id)} className="bg-green-600/80 px-3 py-1 rounded-md hover:bg-green-600">▶️ Start</button>
              <button onClick={() => handleStop(event.id)} className="bg-red-600/80 px-3 py-1 rounded-md hover:bg-red-600">⏹ Stop</button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => handleClear(event.id)} className="bg-cyan-600/80 px-3 py-1 rounded-md hover:bg-cyan-600">🧹 Clear</button>
              <button onClick={() => setConfirmingDelete(event.id)} className="bg-red-700/80 px-3 py-1 rounded-md hover:bg-red-700">❌ Delete</button>
              <button onClick={() => setSelectedEvent(event)} className="bg-blue-600/80 px-3 py-1 rounded-md hover:bg-blue-600">⚙ Options</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 🎞 Gradient animation */}
      <style jsx global>{`
        @keyframes gradient-slow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-slow 20s ease infinite;
        }
      `}</style>
    </main>
  );
}
