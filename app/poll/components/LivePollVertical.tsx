'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import PollDurationTimer from './PollDurationTimer';
import PollResultsOverlay from './PollResultsOverlay';

interface LivePollVerticalProps {
  poll: any;
}

export default function LivePollVertical({ poll }: LivePollVerticalProps) {
  const [options, setOptions] = useState<any[]>(poll.options || []);
  const [winner, setWinner] = useState<any | null>(null);
  const [status, setStatus] = useState<string>(poll.status);

  /* ---------- Realtime Votes ---------- */
  useEffect(() => {
    const channel = supabase
      .channel('poll-votes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'polls', filter: `id=eq.${poll.id}` },
        (payload) => {
          if (payload.new?.options) setOptions(payload.new.options);
          if (payload.new?.status) setStatus(payload.new.status);
        }
      )
      .subscribe();

    // ✅ Safe cleanup wrapper to avoid async return type errors
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [poll.id]);

  /* ---------- Winner Tracking ---------- */
  useEffect(() => {
    if (options.length > 0) {
      const top = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
      setWinner(top);
    }
  }, [options]);

  const totalVotes = options.reduce((sum, o) => sum + (o.votes || 0), 0) || 1;
  const maxVotes = Math.max(...options.map((o) => o.votes || 0), 5);

  return (
    <div
      className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-white"
      style={{
        background:
          poll.background_type === 'image'
            ? `url(${poll.background_value}) center/cover no-repeat`
            : poll.background_value ||
              'linear-gradient(to bottom right, #1b2735, #090a0f)',
      }}
    >
      {/* ---------- Title ---------- */}
      <h1 className="text-5xl font-extrabold drop-shadow-lg text-center mb-10">
        {poll.title || 'Live Fan Poll'}
      </h1>

      {/* ---------- Timer ---------- */}
      {poll.duration && <PollDurationTimer pollId={poll.id} duration={poll.duration} />}

      {/* ---------- Bars (Vertical Layout) ---------- */}
      <div className="w-[90%] flex flex-col justify-center gap-4">
        {options.map((opt, idx) => {
          const percent = (opt.votes / maxVotes) * 100;
          const isWinner = winner && winner.text === opt.text;
          return (
            <motion.div
              key={idx}
              className="flex flex-col"
              style={{ height: `${100 / options.length}%` }}
            >
              <div className="flex items-center w-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1.2 }}
                  style={{
                    background: opt.color,
                    height: '40px',
                    borderRadius: '0 12px 12px 0',
                    boxShadow: isWinner
                      ? `0 0 30px ${opt.color}, 0 0 60px ${opt.color}`
                      : 'none',
                  }}
                  className="relative flex items-center justify-end pr-3"
                >
                  {opt.votes > 0 && (
                    <span className="text-lg font-bold drop-shadow-md">
                      {opt.votes}
                    </span>
                  )}
                </motion.div>
              </div>
              <p className="mt-1 ml-1 text-sm font-semibold">{opt.text}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ---------- Overlay ---------- */}
      <PollResultsOverlay show={status === 'closed'} winner={winner} />
    </div>
  );
}
