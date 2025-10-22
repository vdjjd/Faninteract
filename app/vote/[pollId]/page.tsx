'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

export default function VotePage() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [voted, setVoted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- FETCH POLL + OPTIONS ---------- */
  useEffect(() => {
    async function loadPoll() {
      const { data, error } = await supabase
        .from('polls')
        .select('*, poll_options(*)')
        .eq('id', pollId)
        .single();

      if (error) console.error('❌ Error loading poll:', error);
      if (data) {
        setPoll(data);
        setOptions(data.poll_options || []);
      }

      // Check if this user already voted
      const stored = localStorage.getItem(`voted_${pollId}`);
      if (stored) {
        setVoted(true);
        setSelected(stored);
      }

      setLoading(false);
    }

    loadPoll();
  }, [pollId]);

  /* ---------- HANDLE VOTE ---------- */
  async function handleVote(optionId: string) {
    if (voted) return;

    try {
      const { error } = await supabase.rpc('increment_vote', { option_id: optionId });
      if (error) throw error;

      localStorage.setItem(`voted_${pollId}`, optionId);
      setSelected(optionId);
      setVoted(true);
      setOptions((prev) =>
        prev.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o))
      );
    } catch (err) {
      console.error('❌ Vote failed:', err);
    }
  }

  if (loading) return <div className="text-white text-center mt-10">Loading poll…</div>;
  if (!poll) return <div className="text-white text-center mt-10">Poll not found.</div>;

  if (poll.status !== 'live')
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <h1 className="text-3xl font-bold mb-3">⏳ Poll not active</h1>
        <p className="text-gray-400">Please wait until the host starts this poll.</p>
      </div>
    );

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-white"
      style={{
        background:
          poll.background_type === 'image'
            ? `url(${poll.background_value}) center/cover no-repeat`
            : poll.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)',
      }}
    >
      <div className="bg-black/40 backdrop-blur-lg p-6 rounded-2xl border border-white/10 max-w-lg w-full text-center shadow-xl">
        <h1 className="text-2xl font-extrabold mb-6">{poll.title}</h1>

        <div className="flex flex-col gap-4">
          {options.map((opt) => {
            const color = opt.color || '#0d6efd';
            const isSelected = selected === opt.id;

            return (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleVote(opt.id)}
                disabled={voted}
                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all shadow-md ${
                  voted
                    ? isSelected
                      ? 'bg-green-600'
                      : 'bg-gray-700'
                    : 'hover:scale-105'
                }`}
                style={{
                  background: voted
                    ? isSelected
                      ? color
                      : 'rgba(255,255,255,0.1)'
                    : color,
                  opacity: voted && !isSelected ? 0.5 : 1,
                }}
              >
                {opt.text}
              </motion.button>
            );
          })}
        </div>

        {voted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-green-400 font-semibold text-lg"
          >
            ✅ Thanks for voting!
          </motion.div>
        )}
      </div>
    </div>
  );
}

