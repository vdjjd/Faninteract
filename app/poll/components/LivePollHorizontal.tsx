'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import PollDurationTimer from './PollDurationTimer';
import PollResultsOverlay from './PollResultsOverlay';

interface LivePollHorizontalProps {
  poll: any;
}

export default function LivePollHorizontal({ poll }: LivePollHorizontalProps) {
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

    // ✅ Safe async cleanup wrapper
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
      <h1 className="text-5xl font-extrabold drop-shadow-lg text-center mb-12">
        {poll.title || 'Live Fan Poll'}
      </h1>

      {/* ---------- Timer ---------- */}
      {poll.duration && <PollDurationTimer pollId={poll.id} duration={poll.duration} />}

      {/* ---------- Bars (Horizontal) ---------- */}
      <div className="w-[90%] flex justify-center items-end gap-6 h-[60vh]">
        {options.map((opt, idx) => {
          const percent = (opt.votes / maxVotes) * 100;
          const isWinner = winner && winner.text === opt.text;
          return (
            <motion.div
              key={idx}
              className="flex flex-col items-center justify-end"
              style={{ width: `${80 / options.length}%` }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${percent}%` }}
                transition={{ duration: 1.2 }}
                style={{
                  background: opt.color,
                  borderRadius: '12px 12px 0 0',
                  boxShadow: isWinner
                    ? `0 0 30px ${opt.color}, 0 0 60px ${opt.color}`
                    : 'none',
                  width: '100%',
                  minHeight: '5px',
                }}
                className="relative flex items-end justify-center"
              >
                {opt.votes > 0 && (
                  <span className="absolute -top-8 text-2xl font-bold drop-shadow-md">
                    {opt.votes}
                  </span>
                )}
              </motion.div>
              <p className="mt-3 text-center text-sm font-semibold max-w-[90%] break-words">
                {opt.text}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* ---------- Overlay ---------- */}
      <PollResultsOverlay show={status === 'closed'} winner={winner} />
    </div>
  );
}