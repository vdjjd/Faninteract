'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

import InactivePollWall from '../components/InactivePollWall';
import ActivePollWall from '../components/ActivePollWall';
import { cn } from '../../../lib/utils';

export default function PollRouterPage() {
  const { pollId } = useParams();
  const id = Array.isArray(pollId) ? pollId[0] : pollId;

  const rt = useRealtimeChannel();
  const [poll, setPoll] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  /* ------------------------------------------------------------ */
  /* ✅ Load Poll + Host                                          */
  /* ------------------------------------------------------------ */
  async function loadEverything() {
    try {
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*, hosts(*)')
        .eq('id', id)
        .maybeSingle();

      if (pollError) throw pollError;
      if (!pollData) {
        console.warn('Poll not found:', id);
        setLoading(false);
        return;
      }

      setPoll(pollData);
      setHost(pollData.hosts || null);
    } catch (err) {
      console.error('❌ Poll load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadEverything();
  }, [id]);

  /* ------------------------------------------------------------ */
  /* ✅ Listen for live status / updates                          */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    if (!rt?.current || !id) return;
    const channel = rt.current;

    const scheduleUpdate = (data: any) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setPoll((prev: any) => ({ ...prev, ...data }));
      }, 150);
    };

    channel.on('broadcast', {}, ({ event, payload }) => {
      if (!payload?.id || payload.id !== id) return;

      if (event === 'poll_update') scheduleUpdate(payload);
      if (event === 'poll_status') {
        if (payload.status) scheduleUpdate({ status: payload.status });
      }
    });

    return () => channel.unsubscribe?.();
  }, [rt, id]);

  /* ------------------------------------------------------------ */
  /* ✅ Render                                                    */
  /* ------------------------------------------------------------ */
  if (loading)
    return (
      <div
        className={cn(
          'flex',
          'items-center',
          'justify-center',
          'h-screen',
          'text-white',
          'text-2xl',
          'bg-black'
        )}
      >
        Loading Poll…
      </div>
    );

  if (!poll)
    return (
      <div
        className={cn(
          'flex',
          'items-center',
          'justify-center',
          'h-screen',
          'text-white',
          'text-2xl',
          'bg-black'
        )}
      >
        Poll not found.
      </div>
    );

  /* ------------------------------------------------------------ */
  /* ✅ Switch between walls live                                 */
  /* ------------------------------------------------------------ */
  return poll.status === 'active' ? (
    <ActivePollWall poll={poll} host={host} />
  ) : (
    <InactivePollWall poll={poll} host={host} />
  );
}
