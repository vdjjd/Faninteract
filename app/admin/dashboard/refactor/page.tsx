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
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">🧪 Refactor Dashboard</h1>
      <p>Host: {host?.email}</p>

      <div className="mt-6">
        <p>Events loaded: {events.length}</p>
        <p>Polls loaded: {polls.length}</p>
      </div>
    </div>
  );
}
