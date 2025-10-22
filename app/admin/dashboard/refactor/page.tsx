'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getEventsByHost,
} from '@/lib/actions/events';
import {
  getPollsByHost,
} from '@/lib/actions/polls';
import DashboardHeader from './components/DashboardHeader';
import CreateFanWallModal from '@/components/CreateFanWallModal';
import CreatePollModal from '@/components/CreatePollModal';
import FanWallGrid from './components/FanWallGrid';
import PollGrid from './components/PollGrid';

export default function DashboardRefactor() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPollModalOpen, setPollModalOpen] = useState(false);

  /* ---------- LOAD HOST + DATA ---------- */
  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  /* ---------- RELOAD HELPERS ---------- */
  async function refreshEvents() {
    if (!host) return;
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function refreshPolls() {
    if (!host) return;
    const updated = await getPollsByHost(host.id);
    setPolls(updated);
  }

  /* ---------- OPEN MODALS ---------- */
  function handleCreateFanWall() {
    setFanWallModalOpen(true);
  }

  function handleCreatePoll() {
    setPollModalOpen(true);
  }

  /* ---------- TOAST ---------- */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white flex flex-col items-center p-8">
      {/* HEADER */}
      <DashboardHeader
        onCreateFanWall={handleCreateFanWall}
        onCreatePoll={handleCreatePoll}
      />

      {/* HOST + STATUS */}
      <div className="mt-6 text-center">
        <h1 className="text-2xl font-bold mb-2">🎛 Refactor Host Dashboard</h1>
        <p className="text-lg text-gray-300 mb-4">
          Host: {host?.email || 'Unknown'}
        </p>

        <div className="bg-black/40 p-6 rounded-xl shadow-md border border-white/20 w-72 mx-auto">
          <p className="text-lg">
            🎤 Fan Zone Walls: <strong>{events.length}</strong>
          </p>
          <p className="text-lg mt-1">
            📊 Live Poll Walls: <strong>{polls.length}</strong>
          </p>
        </div>
      </div>

      {/* ---------- GRIDS ---------- */}
      <FanWallGrid events={events} host={host} refreshEvents={refreshEvents} />
      <PollGrid polls={polls} host={host} refreshPolls={refreshPolls} />

      {/* ---------- MODALS ---------- */}
      <CreateFanWallModal
        isOpen={isFanWallModalOpen}
        onClose={() => setFanWallModalOpen(false)}
        hostId={host?.id}
        refreshEvents={async () => {
          await refreshEvents();
          showToast('✅ Fan Zone Wall created!');
        }}
      />

      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setPollModalOpen(false)}
        hostId={host?.id}
        refreshPolls={async () => {
          await refreshPolls();
          showToast('✅ Live Poll created!');
        }}
      />

      {/* ---------- TOAST ---------- */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn z-50">
          {toast}
        </div>
      )}

      {/* ---------- STYLE ---------- */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}