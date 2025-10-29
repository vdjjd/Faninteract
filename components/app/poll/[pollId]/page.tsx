'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';
import InactivePollWall from '@/app/wall/components/polls/InactivePollWall';
import LivePollHorizontal from '@/app/poll/components/LivePollHorizontal';
import LivePollVertical from '@/app/poll/components/LivePollVertical';

/* ---------- COUNTDOWN DISPLAY ---------- */
function CountdownDisplay({
  countdown,
  countdownActive,
  pollId,
}: {
  countdown: string;
  countdownActive: boolean;
  pollId: string;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [originalTime, setOriginalTime] = useState<number>(0);

  useEffect(() => {
    if (!countdown) return;
    const num = parseInt(countdown.split(' ')[0]);
    const mins = countdown.toLowerCase().includes('minute');
    const secs = countdown.toLowerCase().includes('second');
    const total = mins ? num * 60 : secs ? num : 0;
    setTimeLeft(total);
    setOriginalTime(total);
  }, [countdown]);

  useEffect(() => {
    if (!countdownActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          (async () => {
            const { error } = await supabase
              .from('polls')
              .update({
                status: 'live',
                countdown_active: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', pollId);
            if (error) console.error('❌ Error setting poll live:', error);
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive, pollId, timeLeft]);

  useEffect(() => {
    if (!countdownActive) setTimeLeft(originalTime);
  }, [countdownActive, originalTime]);

  if (!countdown) return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <div
      className="text-white font-extrabold text-[4vw] mt-[1vh]"
      style={{ textShadow: '0 0 15px rgba(0,0,0,0.6)' }}
    >
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* ---------- MAIN POLL WALL PAGE ---------- */
export default function PollWallPage() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pollId) return;

    async function fetchPoll() {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (error) {
        console.error('❌ Error loading poll:', error.message);
        return;
      }

      setPoll(data);
      setOptions(Array.isArray(data.options) ? data.options : []);
      setLoading(false);
    }

    fetchPoll();

    // 🔄 Real-time updates
    const channel = supabase
      .channel(`poll-updates-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${pollId}`,
        },
        (payload: any) => {
          const newPoll = payload.new as Record<string, any> | null;
          if (newPoll) {
            console.log('📡 Realtime poll update:', newPoll.status);
            setPoll(newPoll);
            setOptions(Array.isArray(newPoll.options) ? newPoll.options : []);
          }
        }
      )
      .subscribe((status) =>
        console.log(`📡 Poll channel [${pollId}] → ${status}`)
      );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId]);

  if (loading || !poll)
    return (
      <div className="text-white text-center mt-10 text-2xl">Loading poll...</div>
    );

  return (
    <AnimatePresence mode="wait">
      {/* ---------- Inactive ---------- */}
      {poll.status === 'inactive' && !poll.countdown_active && (
        <motion.div
          key="inactive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <InactivePollWall poll={poll} />
        </motion.div>
      )}

      {/* ---------- Countdown ---------- */}
      {poll.countdown_active && (
        <motion.div
          key="countdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="w-full h-screen flex flex-col items-center justify-center text-center text-white"
          style={{
            background:
              poll.background_type === 'image'
                ? `url(${poll.background_value}) center/cover no-repeat`
                : poll.background_value ||
                  'linear-gradient(to bottom right,#1b2735,#090a0f)',
          }}
        >
          <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
            Poll Starting Soon
          </h1>
          <CountdownDisplay
            countdown={poll.countdown}
            countdownActive={poll.countdown_active}
            pollId={poll.id}
          />
        </motion.div>
      )}

      {/* ---------- Live / Closed ---------- */}
      {(poll.status === 'live' || poll.status === 'closed') && (
        <motion.div
          key="live"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          {/* ✅ Corrected layout selector */}
          {poll.layout === 'vertical' ? (
            <LivePollVertical poll={poll} />
          ) : (
            <LivePollHorizontal poll={poll} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}