'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface LivePollWallProps {
  poll: any;
}

export default function LivePollWall({ poll }: LivePollWallProps) {
  const options = poll?.options || [];
  const totalVotes =
    options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0) || 1;

  const [durationLeft, setDurationLeft] = useState<number | null>(null);
  const [winner, setWinner] = useState<any>(null);
  const [isClosed, setIsClosed] = useState(false);

  /* ---------- DURATION TIMER ---------- */
  useEffect(() => {
    if (!poll?.duration) return;

    const num = parseInt(poll.duration.split(' ')[0]);
    const mins = poll.duration.toLowerCase().includes('minute');
    const secs = poll.duration.toLowerCase().includes('second');
    const total = mins ? num * 60 : secs ? num : 0;

    setDurationLeft(total);

    const timer = setInterval(async () => {
      setDurationLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          setDurationLeft(0);
          setIsClosed(true);

          // 🟢 Auto-update Supabase when time runs out
          (async () => {
            const { error } = await supabase
              .from('polls')
              .update({ status: 'closed', updated_at: new Date().toISOString() })
              .eq('id', poll.id);
            if (error) console.error('❌ Error closing poll:', error);
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [poll?.duration, poll?.id]);

  /* ---------- WINNER HIGHLIGHT ---------- */
  useEffect(() => {
    if (options.length > 0) {
      const top = [...options].sort(
        (a, b) => (b.votes || 0) - (a.votes || 0)
      )[0];
      setWinner(top);
    }
  }, [options]);

  const colorPresets = [
    '#0d6efd',
    '#dc3545',
    '#198754',
    '#ffc107',
    '#6610f2',
    '#fd7e14',
    '#20c997',
    '#6c757d',
  ];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
      {/* ---------- HEADER ---------- */}
      <div className="absolute top-6 left-0 right-0 flex justify-center items-center">
        <h1 className="text-5xl font-extrabold text-center drop-shadow-lg">
          {poll.title || 'Live Fan Poll'}
        </h1>
      </div>

      {/* ---------- DURATION TIMER (Top-Right Corner) ---------- */}
      {!isClosed && durationLeft !== null && (
        <div className="absolute top-6 right-8 text-2xl font-bold text-white/90">
          ⏱ {formatTime(durationLeft)}
        </div>
      )}

      {/* ---------- POLL BARS ---------- */}
      <div className="w-[80%] max-w-5xl flex flex-col gap-6 mt-20">
        {options.map((opt: any, i: number) => {
          const percent = Math.round(((opt.votes || 0) / totalVotes) * 100);
          const color = opt.color || colorPresets[i % colorPresets.length];
          const isWinner = winner && winner.text === opt.text;

          return (
            <motion.div key={opt.text + i} className="w-full">
              <div className="flex justify-between text-sm mb-1 px-1">
                <span
                  className={`font-semibold ${
                    isWinner ? 'text-yellow-300 drop-shadow-[0_0_10px_gold]' : ''
                  }`}
                >
                  {opt.text}
                </span>
                <span>{opt.votes || 0} votes</span>
              </div>

              <div className="relative w-full bg-white/15 rounded-full overflow-hidden h-12">
                <AnimatePresence>
                  <motion.div
                    key={opt.votes}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8 }}
                    style={{
                      height: '100%',
                      background: color,
                      backgroundImage: `repeating-linear-gradient(
                        45deg,
                        ${color} 0,
                        ${color} 10px,
                        rgba(255,255,255,0.15) 10px,
                        rgba(255,255,255,0.15) 20px
                      )`,
                      borderRadius: '9999px',
                      boxShadow: isWinner
                        ? `0 0 25px ${color}, 0 0 60px ${color}`
                        : 'none',
                    }}
                    className="flex items-center justify-center text-xs font-bold"
                  >
                    {percent > 5 && <span>{percent}%</span>}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ---------- TOTAL VOTE COUNT ---------- */}
      <div className="absolute bottom-6 text-xl text-white/80 font-semibold drop-shadow-md">
        Total Votes: {totalVotes}
      </div>

      {/* ---------- CLOSED OVERLAY ---------- */}
      <AnimatePresence>
        {isClosed && winner && (
          <motion.div
            key="closed-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 text-center"
          >
            <motion.h1
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="text-5xl font-extrabold text-yellow-400 drop-shadow-[0_0_25px_gold]"
            >
              🏁 POLL CLOSED
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 1 }}
              className="text-4xl font-bold mt-6 text-white drop-shadow-[0_0_20px_gold]"
            >
              Winner: {winner.text}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 1 }}
              className="text-2xl text-gray-200 mt-2"
            >
              {winner.votes || 0} votes (
              {Math.round(((winner.votes || 0) / totalVotes) * 100)}%)
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- FULLSCREEN BUTTON ---------- */}
      <div
        className="fixed bottom-3 right-3 w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer z-[60] opacity-20 hover:opacity-100 transition-all duration-300 bg-white/10 backdrop-blur-md border border-white/20"
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen().catch(console.error);
          else document.exitFullscreen();
        }}
        title="Toggle Fullscreen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="white"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"
          />
        </svg>
      </div>
    </div>
  );
}
