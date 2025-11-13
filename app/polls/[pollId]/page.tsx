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

  const [isFading, setIsFading] = useState(false);

  /* ------------------------------------------------------------ */
  /* Load Poll + Host                                             */
  /* ------------------------------------------------------------ */
  async function loadEverything() {
    try {
      const { data: pollData } = await supabase
        .from('polls')
        .select('*, hosts(*)')
        .eq('id', id)
        .maybeSingle();

      if (!pollData) {
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
  /* 🔥 REALTIME LISTENERS (PATCHED)                              */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    if (!id) return;

    /* 1️⃣ Shared realtime channel */
    const shared = rt?.current;

    const scheduleUpdate = (data: any) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setPoll((prev) => ({ ...prev, ...data }));
      }, 150);
    };

    shared?.on('broadcast', {}, ({ event, payload }) => {
      if (!payload?.id || payload.id !== id) return;

      if (event === 'poll_update') scheduleUpdate(payload);

      if (event === 'poll_status' && payload.status) {
        scheduleUpdate({ status: payload.status });
      }
    });

    /* 2️⃣ Dedicated poll-specific realtime channel */
    const pollChannel = supabase
      .channel(`poll-${id}`)
      .on(
        'broadcast',
        { event: 'poll_status' },
        (msg) => {
          if (msg?.payload?.status) {
            setPoll((prev) => ({ ...prev, status: msg.payload.status }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pollChannel);
      // ❌ DO NOT unsubscribe shared channel (rt.current)
    };
  }, [rt, id]);

  /* ------------------------------------------------------------ */
  /* Fade Logic: both directions now                              */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    if (!poll) return;

    // Active → fade to active wall
    if (poll.status === 'active') {
      setIsFading(true);
      const timer = setTimeout(() => setIsFading(false), 1500);
      return () => clearTimeout(timer);
    }

    // Inactive / Closed → fade back to inactive wall
    if (poll.status === 'inactive' || poll.status === 'closed') {
      setIsFading(true);
      const timer = setTimeout(() => setIsFading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [poll?.status]);

  /* ------------------------------------------------------------ */
  /* Render                                                       */
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
  /* Layer display logic                                          */
  /* ------------------------------------------------------------ */
  const showInactive =
    poll.status !== 'active' || (poll.status === 'active' && isFading);

  const showActive =
    poll.status === 'active' && !isFading;

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Inactive Wall Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transition: 'opacity 1.5s ease',
          opacity: showInactive ? 1 : 0,
          pointerEvents: showInactive ? 'auto' : 'none',
        }}
      >
        <InactivePollWall poll={poll} host={host} />
      </div>

      {/* Active Wall Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transition: 'opacity 1.5s ease',
          opacity: showActive ? 1 : 0,
          pointerEvents: showActive ? 'auto' : 'none',
        }}
      >
        <ActivePollWall poll={poll} host={host} />
      </div>
    </div>
  );
}
