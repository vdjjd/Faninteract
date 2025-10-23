'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getEventsByHost } from '@/lib/actions/events';
import { getPollsByHost } from '@/lib/actions/polls';
import DashboardHeader from './components/DashboardHeader';
import CreateFanWallModal from '@/components/CreateFanWallModal';
import CreatePollModal from '@/components/CreatePollModal';
import FanWallGrid from './components/FanWallGrid';
import PollGrid from './components/PollGrid';
import OptionsModalFanWall from '@/components/OptionsModalFanWall';

export default function DashboardPage() {  // ✅ renamed from DashboardRefactor
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modal States
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPollModalOpen, setPollModalOpen] = useState(false);
  const [selectedWall, setSelectedWall] = useState<any | null>(null);

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

  /* ---------- REFRESH HELPERS ---------- */
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

  /* ---------- CREATE HANDLERS ---------- */
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

      {/* FAN WALL GRID */}
      <FanWallGrid
        events={events}
        host={host}
        refreshEvents={refreshEvents}
        onOpenOptions={(wall) => setSelectedWall(wall)}
      />

      {/* POLL GRID */}
      <PollGrid
        polls={polls}
        host={host}
        refreshPolls={refreshPolls}
        onOpenOptions={(p) => console.log('Poll Options:', p)}
      />

      {/* CREATE FAN WALL MODAL */}
      <CreateFanWallModal
        isOpen={isFanWallModalOpen}
        onClose={() => setFanWallModalOpen(false)}
        hostId={host?.id}
        refreshEvents={async () => {
          await refreshEvents();
          showToast('✅ Fan Zone Wall created!');
        }}
      />

      {/* CREATE POLL MODAL */}
      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setPollModalOpen(false)}
        hostId={host?.id}
        refreshPolls={async () => {
          await refreshPolls();
          showToast('✅ Live Poll created!');
        }}
      />

      {/* OPTIONS MODAL (Fan Wall) */}
      {selectedWall && (
        <OptionsModalFanWall
          event={selectedWall}
          hostId={host.id}
          onClose={() => setSelectedWall(null)}
          onBackgroundChange={async (event, newValue) => {
            await supabase
              .from('events')
              .update({ background_value: newValue, updated_at: new Date().toISOString() })
              .eq('id', event.id);
            await refreshEvents();
          }}
          refreshEvents={refreshEvents}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn z-50">
          {toast}
        </div>
      )}

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