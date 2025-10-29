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
  /* ---------- LAUNCH ---------- */
  async function handleLaunch(id: string) {
    const url = `${window.location.origin}/poll/${id}`;
    const popup = window.open(url, '_blank', 'width=1280,height=800,left=100,top=100');
    popup?.focus();
  }

  /* ---------- START ---------- */
  async function handleStart(id: string) {
    const { data, error: fetchError } = await supabase
      .from('polls')
      .select('countdown')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching countdown:', fetchError);
      return;
    }

    const hasCountdown =
      data?.countdown && data.countdown !== 'none' && data.countdown !== null;

    if (hasCountdown) {
      // 🕒 Start countdown mode (show inactive wall with timer)
      await supabase
        .from('polls')
        .update({
          countdown_active: true,
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } else {
      // 🚀 Start immediately
      await supabase
        .from('polls')
        .update({
          status: 'live',
          countdown_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    await refreshPolls();
  }

  /* ---------- STOP ---------- */
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

  /* ---------- END POLL (Manual Close) ---------- */
  async function handleEnd(id: string) {
    await supabase
      .from('polls')
      .update({
        status: 'closed',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    console.log(`🏁 Poll ${id} manually ended`);
    await refreshPolls();
  }

  /* ---------- CLEAR ---------- */
  async function handleClear(id: string) {
    await clearPoll(id);
    await refreshPolls();
  }

  /* ---------- DELETE ---------- */
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
            <div
              key={poll.id}
              className="rounded-xl p-4 text-center shadow-lg bg-cover bg-center flex flex-col justify-between"
              style={{
                background:
                  poll.background_type === 'image'
                    ? `url(${poll.background_value}) center/cover no-repeat`
                    : poll.background_value || 'linear-gradient(135deg,#0d47a1,#1976d2)',
              }}
            >
              <div>
                <h3 className="font-bold text-lg text-center drop-shadow-md mb-1">
                  {poll.host_title || poll.title || 'Untitled Poll'}
                </h3>
                <p className="text-sm mb-3">
                  <strong>Status:</strong>{' '}
                  <span
                    className={
                      poll.status === 'live'
                        ? 'text-lime-400'
                        : poll.status === 'inactive'
                        ? 'text-orange-400'
                        : poll.status === 'closed'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }
                  >
                    {poll.status}
                  </span>
                </p>
              </div>

              {/* Primary Controls */}
              <div className="flex justify-center gap-2 mb-2 flex-wrap">
                <button
                  onClick={() => handleLaunch(poll.id)}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  🚀 Launch
                </button>
                <button
                  onClick={() => handleStart(poll.id)}
                  className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  ▶️ Play
                </button>
                <button
                  onClick={() => handleStop(poll.id)}
                  className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  ⏹ Stop
                </button>
                <button
                  onClick={() => handleEnd(poll.id)}
                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  🏁 End Poll
                </button>
              </div>

              {/* Secondary Controls */}
              <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 pt-2">
                <button
                  onClick={() => handleClear(poll.id)}
                  className="bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold"
                >
                  🧹 Clear
                </button>
                <button
                  onClick={() => onOpenOptions && onOpenOptions(poll)}
                  className="bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-sm font-semibold"
                >
                  ⚙ Options
                </button>
                <button
                  onClick={() => handleDelete(poll.id)}
                  className="bg-red-800 hover:bg-red-900 px-2 py-1 rounded text-sm font-semibold"
                >
                  ❌ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}