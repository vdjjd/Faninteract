'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import InactivePollWall from '@/app/wall/components/polls/InactivePollWall';

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

  // Convert countdown string → seconds
  useEffect(() => {
    if (!countdown) return;
    const num = parseInt(countdown.split(' ')[0]);
    const mins = countdown.toLowerCase().includes('minute');
    const secs = countdown.toLowerCase().includes('second');
    const total = mins ? num * 60 : secs ? num : 0;
    setTimeLeft(total);
    setOriginalTime(total);
  }, [countdown]);

  // Start countdown when activated
  useEffect(() => {
    if (!countdownActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 🟢 When timer hits zero → set poll live
          (async () => {
            const { error } = await supabase
              .from('polls')
              .update({ status: 'live', countdown_active: false })
              .eq('id', pollId);
            if (error) {
              console.error('❌ Error setting poll live:', error);
            } else {
              console.log('✅ Countdown finished — poll set live');
            }
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive, pollId, timeLeft]);

  // Reset timer if countdown stopped
  useEffect(() => {
    if (!countdownActive) setTimeLeft(originalTime);
  }, [countdownActive, originalTime]);

  if (!countdown) return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <div
      style={{
        fontSize: '4vw',
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 0 15px rgba(0,0,0,0.6)',
        marginTop: '1vh',
      }}
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
      setOptions(data.options || []);
    }

    fetchPoll();

    // 🔄 Realtime updates
    const channel = supabase
      .channel('poll_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `id=eq.${pollId}` },
        (payload: any) => {
          if (payload.new) {
            setPoll(payload.new);
            setOptions(payload.new.options || []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId]);

  /* ---------- LOADING ---------- */
  if (!poll)
    return (
      <div className="text-white text-center mt-10">
        Loading poll...
      </div>
    );

  /* ---------- INACTIVE POLL WALL ---------- */
  if (poll.status === 'inactive') return <InactivePollWall poll={poll} />;

  /* ---------- CLOSED OVERLAY ---------- */
  const closedOverlay = poll.status === 'closed' && (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
      <h1 className="text-5xl font-extrabold text-white drop-shadow-lg">
        🏁 Poll Closed
      </h1>
    </div>
  );

  /* ---------- LIVE POLL DISPLAY ---------- */
  const totalVotes = options.reduce((sum, o) => sum + (o.votes || 0), 0) || 1;

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
      <h1 className="text-4xl font-extrabold mb-6 drop-shadow-lg text-center">
        {poll.title || 'Fan Polling Zone'}
      </h1>

      {/* Countdown visible below title when live */}
      {poll.countdown && poll.countdown_active && (
        <CountdownDisplay
          countdown={poll.countdown}
          countdownActive={poll.countdown_active}
          pollId={poll.id}
        />
      )}

      <div className="w-[80%] max-w-5xl flex flex-col gap-6 relative mt-6">
        {options.map((opt, i) => {
          const percent = Math.round(((opt.votes || 0) / totalVotes) * 100);
          const color = opt.color || colorPresets[i % colorPresets.length];
          return (
            <div key={opt.text + i} className="w-full">
              <div className="flex justify-between text-sm mb-1 px-1">
                <span className="font-semibold">{opt.text}</span>
                <span>{opt.votes || 0} votes</span>
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="white"
          style={{ width: 26, height: 26 }}
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
