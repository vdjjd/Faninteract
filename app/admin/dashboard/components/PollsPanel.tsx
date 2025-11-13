'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

interface PollGridProps {
  host: any;
  refreshPolls: () => Promise<void>;
  onOpenOptions: (poll: any) => void;
}

export default function PollGrid({ host, refreshPolls, onOpenOptions }: PollGridProps) {
  const [localPolls, setLocalPolls] = useState<any[]>([]);
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

  /* ------------------------------------------------------------
     ✅ Load all polls for this host
  ------------------------------------------------------------ */
  async function loadPolls() {
    if (!host?.id) return;
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('host_id', host.id)
      .order('created_at', { ascending: false });

    if (error) console.error('❌ loadPolls error:', error);
    setLocalPolls(data || []);
  }

  useEffect(() => {
    if (!host?.id) return;
    loadPolls();
  }, [host?.id]);

  /* ------------------------------------------------------------
     ✅ REALTIME LISTENER for INSERT, UPDATE, DELETE
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!host?.id) return;

    const channel = supabase
      .channel('polls-grid-sync')
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'polls',
          event: '*',
          filter: `host_id=eq.${host.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLocalPolls((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLocalPolls((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setLocalPolls((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
          delayedRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host?.id]);

  /* ------------------------------------------------------------
     ✅ Debounced refresh (prevents DB spam)
  ------------------------------------------------------------ */
  function delayedRefresh() {
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(() => {
      refreshPolls().catch(console.error);
    }, 400);
  }

  /* ------------------------------------------------------------
     ✅ Actions
  ------------------------------------------------------------ */
  async function handleDelete(id: string) {
    setLocalPolls((prev) => prev.filter((p) => p.id !== id));
    await supabase.from('poll_options').delete().eq('poll_id', id);
    await supabase.from('polls').delete().eq('id', id);
    delayedRefresh();
  }

  function handleLaunch(pollId: string) {
    const url = `${window.location.origin}/polls/${pollId}`;
    const popup = window.open(url, '_blank', 'width=1280,height=800,resizable=yes');
    popup?.focus();
  }

  /* ------------------------------------------------------------
     ✅ Render
  ------------------------------------------------------------ */
  return (
    <div className={cn('mt-10 w-full max-w-6xl')}>
      <h2 className={cn('text-xl font-semibold mb-3')}>📊 Live Polls</h2>

      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
        )}
      >
        {localPolls.length === 0 && (
          <p className={cn('text-gray-400 italic col-span-full')}>
            No polls created yet.
          </p>
        )}

        {localPolls.map((poll) => (
          <div
            key={poll.id}
            className={cn(
              'rounded-xl p-4 text-center shadow-lg bg-cover bg-center flex flex-col justify-between transition-all duration-300',
              poll.status === 'active'
                ? 'ring-4 ring-lime-400 shadow-lime-500/50'
                : poll.status === 'closed'
                ? 'ring-4 ring-rose-500 shadow-rose-500/50'
                : 'ring-0'
            )}
            style={{
              background: 'linear-gradient(135deg,#0d47a1,#1976d2)',
            }}
          >
            {/* Header */}
            <div>
              <h3 className={cn('font-bold', 'text-lg', 'mb-1')}>
                {poll.question || 'Untitled Poll'}
              </h3>
              <p className={cn('text-sm', 'mb-2')}>
                <strong>Status:</strong>{' '}
                <span
                  className={
                    poll.status === 'active'
                      ? 'text-lime-400'
                      : poll.status === 'closed'
                      ? 'text-rose-400'
                      : 'text-orange-400'
                  }
                >
                  {poll.status?.toUpperCase?.() || 'UNKNOWN'}
                </span>
              </p>
            </div>

            {/* Controls */}
            <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mt-auto', 'pt-2', 'border-t', 'border-white/10')}>
              <button
                onClick={() => handleLaunch(poll.id)}
                className={cn('bg-blue-600', 'hover:bg-blue-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                🚀 Launch
              </button>

              <button
                onClick={() => onOpenOptions(poll)}
                className={cn('bg-indigo-500', 'hover:bg-indigo-600', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                ⚙ Options
              </button>

              <button
                onClick={() => handleDelete(poll.id)}
                className={cn('bg-red-700', 'hover:bg-red-800', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
              >
                ❌ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
