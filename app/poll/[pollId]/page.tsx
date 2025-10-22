'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import InactiveWall from '@/components/InactiveWall'; // reuse your existing component

interface PollOption {
  id: string;
  text: string;
  color: string;
  votes: number;
}

export default function PollWallPage() {
  const { eventId } = useParams(); // pollId alias
  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  /* ---------- LOAD POLL ---------- */
  useEffect(() => {
    async function fetchPoll() {
      const { data, error } = await supabase
        .from('polls')
        .select('*, poll_options(*)')
        .eq('id', eventId)
        .single();

      if (!error && data) {
        setPoll(data);
        setOptions(data.poll_options || []);
        if (data.duration_seconds) {
          setDuration(data.duration_seconds);
          setTimeLeft(data.duration_seconds);
        }
      }
    }
    fetchPoll();

const channel = supabase
  .channel('poll_realtime')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'poll_options' },
    (payload: any) => {
      const newRow = (payload && payload.new) || null;
      if (newRow && typeof newRow.poll_id !== 'undefined' && newRow.poll_id === eventId) {
        setOptions((prev) =>
          prev.map((o) =>
            o.id === newRow.id ? { ...o, votes: newRow.votes } : o
          )
        );
      }
    }
  )
  .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  /* ---------- TIMER ---------- */
  useEffect(() => {
    if (!poll || poll.status !== 'live' || !duration) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          endPoll();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [poll, duration]);

  async function endPoll() {
    await supabase
      .from('polls')
      .update({ status: 'closed' })
      .eq('id', eventId);
    const { data } = await supabase
      .from('polls')
      .select('*, poll_options(*)')
      .eq('id', eventId)
      .single();
    setPoll(data);
  }

  if (!poll) return <div className="text-white text-center mt-10">Loading poll...</div>;

  /* ---------- INACTIVE STATE ---------- */
  if (poll.status === 'inactive')
    return <InactiveWall event={{ ...poll, title: 'Fan Zone Polling' }} />;

  /* ---------- CLOSED OVERLAY ---------- */
  const closedOverlay = poll.status === 'closed' && (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
      <h1 className="text-5xl font-extrabold text-white drop-shadow-lg">
        🏁 Poll Closed
      </h1>
    </div>
  );

  /* ---------- CALCULATE PERCENTAGES ---------- */
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0) || 1;

  /* ---------- BAR COLORS ---------- */
  const colorPresets = [
    '#0d6efd', '#dc3545', '#198754', '#ffc107',
    '#6610f2', '#fd7e14', '#20c997', '#6c757d'
  ];

  return (
    <div
      className="w-full h-screen flex flex-col justify-center items-center text-white relative overflow-hidden"
      style={{
        background:
          poll.background_type === 'image'
            ? `url(${poll.background_value}) center/cover no-repeat`
            : poll.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)',
      }}
    >
      {/* Duration timer */}
      {poll.status === 'live' && duration > 0 && (
        <div className="absolute top-6 right-10 text-3xl font-bold drop-shadow-md">
          ⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      )}

      <h1 className="text-4xl font-extrabold mb-10 drop-shadow-lg text-center">
        {poll.title || 'Fan Zone Polling'}
      </h1>

      <div className="w-[80%] max-w-5xl flex flex-col gap-6 relative">
        {options.map((opt, i) => {
          const percent = Math.round((opt.votes / totalVotes) * 100);
          const color = opt.color || colorPresets[i % colorPresets.length];
          return (
            <div key={opt.id} className="w-full">
              <div className="flex justify-between text-sm mb-1 px-1">
                <span className="font-semibold">{opt.text}</span>
                <span>{opt.votes} votes</span>
              </div>
              <div className="relative w-full bg-white/15 rounded-full overflow-hidden h-10">
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
                        rgba(255,255,255,0.2) 10px,
                        rgba(255,255,255,0.2) 20px
                      )`,
                      borderRadius: '9999px',
                    }}
                    className="flex items-center justify-center text-xs font-bold"
                  >
                    {percent > 5 && <span>{percent}%</span>}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {closedOverlay}

      {/* Fullscreen button */}
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          width: 48,
          height: 48,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'opacity 0.3s ease',
          opacity: 0.2,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.2')}
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen().catch(console.error);
          else document.exitFullscreen();
        }}
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: 26, height: 26 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>
    </div>
  );
}
