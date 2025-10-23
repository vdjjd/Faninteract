'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import InactivePollWall from '@/app/wall/components/polls/InactivePollWall';
import LivePollWall from '../components/LivePollWall'; // ✅ Live view component

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
              .update({ status: 'live', countdown_active: false })
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

  /* ---------- LOAD POLL ---------- */
  useEffect(() => {
    if (!pollId) return;

    const fetchPoll = async () => {
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
      setOptions(data.options || []);
    };

    fetchPoll();

    // 🔄 Real-time updates
    const channel = supabase
      .channel('poll_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${pollId}`,
        },
        (payload) => {
          if (payload.new) {
            setPoll(payload.new);
            setOptions(payload.new.options || []);
          }
        }
      )
      .subscribe();

    // ✅ FIX: cleanup must NOT return a Promise
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pollId]);

  /* ---------- STATE HANDLING ---------- */
  if (!poll)
    return (
      <div className="text-white text-center mt-10">Loading poll...</div>
    );

  if (poll.status === 'inactive') return <InactivePollWall poll={poll} />;
  if (poll.status === 'live') return <LivePollWall poll={poll} />;

  /* ---------- CLOSED POLL ---------- */
  return (
    <div
      className="w-full h-screen flex flex-col justify-center items-center text-white relative overflow-hidden"
      style={{
        background:
          poll.background_type === 'image'
            ? `url(${poll.background_value}) center/cover no-repeat`
            : poll.background_value ||
              'linear-gradient(to bottom right,#1b2735,#090a0f)',
      }}
    >
      <h1 className="text-5xl font-extrabold text-white drop-shadow-lg text-center">
        🏁 Poll Closed
      </h1>
    </div>
  );
}
