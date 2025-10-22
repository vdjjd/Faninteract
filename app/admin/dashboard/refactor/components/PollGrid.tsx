'use client';

import GridCard from './GridCard';
import { supabase } from '@/lib/supabaseClient';
import { getPollsByHost, clearPoll, deletePoll } from '@/lib/actions/polls';

interface PollGridProps {
  polls: any[];
  host: any;
  refreshPolls: () => Promise<void>;
}

export default function PollGrid({ polls, host, refreshPolls }: PollGridProps) {
  if (!polls?.length) {
    return (
      <div className="mt-10 text-center text-gray-400">
        <p>No Live Polls yet.</p>
      </div>
    );
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

  async function handleStartPoll(id: string) {
    const { data: poll } = await supabase.from('polls').select('*').eq('id', id).single();
    if (!poll) return;

    const update = poll.countdown
      ? { countdown_active: true, status: 'inactive' }
      : { status: 'live', countdown_active: false };

    await supabase
      .from('polls')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', id);

    await refreshPolls();
  }

  async function handleStopPoll(id: string) {
    await supabase
      .from('polls')
      .update({ status: 'inactive', countdown_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    await refreshPolls();
  }

  async function handleClearPoll(id: string) {
    await clearPoll(id);
    await refreshPolls();
  }

  async function handleDeletePoll(id: string) {
    await deletePoll(id);
    await refreshPolls();
  }

  /* ---------- UI ---------- */
  return (
    <div className="w-full mt-10">
      <h2 className="text-xl font-semibold mb-3 text-center">📊 Live Poll Walls</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {polls.map((poll) => (
          <GridCard
            key={poll.id}
            id={poll.id}
            title={poll.title}
            hostTitle={poll.host_title}
            status={poll.status}
            backgroundType={poll.background_type}
            backgroundValue={poll.background_value}
            type="poll"
            onLaunch={handleLaunchPoll}
            onStart={handleStartPoll}
            onStop={handleStopPoll}
            onClear={handleClearPoll}
            onDelete={handleDeletePoll}
          />
        ))}
      </div>
    </div>
  );
}
