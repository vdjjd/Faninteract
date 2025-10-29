'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface PollDurationTimerProps {
  pollId: string;
  duration: string | null;
}

function parseDuration(duration: string | null): number {
  if (!duration) return 0;
  const minutes = parseInt(duration);
  return isNaN(minutes) ? 0 : minutes * 60;
}

export default function PollDurationTimer({ pollId, duration }: PollDurationTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(parseDuration(duration));
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          endPoll();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  async function endPoll() {
    try {
      await supabase
        .from('polls')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pollId);
      setIsActive(false);
    } catch (err) {
      console.error('❌ Error ending poll:', err);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="absolute top-4 right-6 text-3xl font-bold font-[Bebas_Neue] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] select-none">
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}