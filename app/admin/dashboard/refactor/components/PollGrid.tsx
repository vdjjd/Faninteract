'use client';

import { supabase } from '@/lib/supabaseClient';
import { deletePoll, clearPoll } from '@/lib/actions/polls';

interface PollGridProps {
  polls: any[];
  host: any;
  refreshPolls: () => Promise<void>;
  onOpenOptions?: (poll: any) => void;
}

export default function PollGrid({
  polls,
  host,
  refreshPolls,
  onOpenOptions,
}: PollGridProps) {
  if (!polls?.length) {
    return (
      <div className="mt-10 text-center text-gray-400">
        <p>No Live Polls created yet.</p>
      </div>
    );
  }

  /* ---------- CONTROLS ---------- */
  async function handleLaunchPoll(id: string) {
    const pollUrl = `${window.location.origin}/vote/${id}`;
    const popup = window.open(
      pollUrl,
      '_blank',
      'width=800,height=700,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no'
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
      <h2 className="text-xl font-semibold mb-3 text-center">📊 Live Polls</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {polls.map((poll) => {
          const isLive = poll.status === 'live';

          return (
            <div
              key={poll.id}
              className={`rounded-xl p-4 text-center shadow-lg bg-cover bg-center border transition-all duration-300 ${
                isLive
                  ? 'border-green-400 shadow-green-400/30 animate-glow-green'
                  : 'border-transparent'
              }`}
              style={{
                background:
                  poll.background_type === 'image'
                    ? `url(${poll.background_value}) center/cover no-repeat`
                    : poll.background_value || 'linear-gradient(135deg,#0d47a1,#1976d2)',
              }}
            >
              {/* ---- TITLE ---- */}
              <h3 className="font-bold text-lg text-center drop-shadow-md">
                {poll.host_title || poll.title || 'Untitled Poll'}
              </h3>

              {/* ---- STATUS ---- */}
              <p className="text-sm mt-1 mb-3">
                <strong>Status:</strong>{' '}
                <span
                  className={
                    poll.status === 'live'
                      ? 'text-lime-400'
                      : poll.status === 'inactive'
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }
                >
                  {poll.status}
                </span>
              </p>

              {/* ---- CONTROL BUTTONS ---- */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => handleLaunchPoll(poll.id)}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  🚀 Launch
                </button>
                <button
                  onClick={() => handleStartPoll(poll.id)}
                  className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  ▶️ Play
                </button>
                <button
                  onClick={() => handleStopPoll(poll.id)}
                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-semibold"
                >
                  ⏹ Stop
                </button>
                <button
                  onClick={() => handleClearPoll(poll.id)}
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
                  onClick={() => handleDeletePoll(poll.id)}
                  className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold"
                >
                  ❌ Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- ANIMATIONS ---- */}
      <style jsx>{`
        @keyframes glowGreen {
          0%, 100% {
            box-shadow: 0 0 8px rgba(0, 255, 100, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(0, 255, 100, 0.6);
          }
        }
        .animate-glow-green {
          animation: glowGreen 2.5s infinite;
        }
      `}</style>
    </div>
  );
}
