'use client';

import { supabase } from '@/lib/supabaseClient';
import { clearPoll, deletePoll } from '@/lib/actions/polls';
import GridCard from './GridCard';

interface PollGridProps {
  polls: any[];
  host: any;
  refreshPolls: () => Promise<void>;
  onOpenOptions?: (poll: any) => void;
}

export default function PollGrid({ polls, host, refreshPolls, onOpenOptions }: PollGridProps) {
  /* ---------- HANDLERS ---------- */
  async function handleLaunch(id: string) {
    const url = `${window.location.origin}/poll/${id}`;
    const popup = window.open(url, '_blank', 'width=1280,height=800,left=100,top=100');
    popup?.focus();
  }

  async function handleStart(id: string) {
    await supabase
      .from('polls')
      .update({
        status: 'live',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await refreshPolls();
  }

  async function handleStop(id: string) {
    await supabase
      .from('polls')
      .update({
        status: 'inactive',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await refreshPolls();
  }

  async function handleClear(id: string) {
    await clearPoll(id);
    await refreshPolls();
  }

  async function handleDelete(id: string) {
    await deletePoll(id);
    await refreshPolls();
  }

  /* ---------- UI ---------- */
  return (
    <div className="mt-10 w-full max-w-6xl">
      <h2 className="text-xl font-semibold mb-3">📊 Live Poll Walls</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {polls.length === 0 ? (
          <p className="text-gray-400 italic">No Live Polls created yet.</p>
        ) : (
          polls.map((poll) => (
            <GridCard
              key={poll.id}
              id={poll.id}
              title={poll.title}
              hostTitle={poll.host_title}
              status={poll.status}
              backgroundType={poll.background_type}
              backgroundValue={poll.background_value}
              type="poll"
              onLaunch={handleLaunch}
              onStart={handleStart}
              onStop={handleStop}
              onClear={handleClear}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
