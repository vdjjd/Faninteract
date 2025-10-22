'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getEventsByHost,
  createEvent,
  deleteEvent,
  clearEventPosts,
} from '@/lib/actions/events';
import {
  getPollsByHost,
  createPoll,
  deletePoll,
  clearPoll,
} from '@/lib/actions/polls';
import OptionsModal from '@/components/OptionsModal';
import DashboardHeader from './components/DashboardHeader'; // ✅ new import

export default function DashboardRefactor() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white flex flex-col items-center p-8">
      {/* ✅ Header with logo + buttons */}
      <DashboardHeader
        onCreateFanWall={() => console.log('Create Fan Wall clicked')}
        onCreatePoll={() => console.log('Create Poll clicked')}
      />

      {/* ✅ Simple status readout */}
      <div className="mt-6 text-center">
        <h1 className="text-2xl font-bold mb-2">🧪 Refactor Dashboard</h1>
        <p className="text-lg text-gray-300 mb-4">
          Host: {host?.email}
        </p>

        <div className="bg-black/40 p-4 rounded-lg shadow-md border border-white/20">
          <p>🎤 Fan Zone Walls Loaded: <strong>{events.length}</strong></p>
          <p>📊 Live Polls Loaded: <strong>{polls.length}</strong></p>
        </div>
      </div>
    </div>
  );
}
