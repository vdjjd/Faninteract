'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

// 👇 UPDATED IMPORT PATHS to match your folder structure
import InactivePrizeWall from '../components/wall/InactiveWall';
import ActivePrizeWall from '../components/wall/ActiveWall';

/* ---------- Data Type ---------- */
interface PrizeWheelData {
  id: string;
  title: string | null;
  host_id: string;
  status: 'inactive' | 'live';
  background_type: string | null;
  background_value: string | null;
  logo_url?: string | null;
  spin_speed?: string | null;
  countdown?: string | null;
  countdown_active?: boolean;
  host?: {
    branding_logo_url?: string | null;
  };
}

/* ---------- Main Page ---------- */
export default function PrizeWheelPage() {
  const { wheelId } = useParams();
  const [wheel, setWheel] = useState<PrizeWheelData | null>(null);
  const [loading, setLoading] = useState(true);

  /* --- Load Wheel --- */
  async function loadWheel() {
    if (!wheelId) return;

    const { data, error } = await supabase
      .from('prize_wheels')
      .select(
        `
        *,
        host:hosts (
          branding_logo_url
        )
      `
      )
      .eq('id', wheelId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading prize wheel:', error);
    } else {
      setWheel(data);
    }

    setLoading(false);
  }

  /* --- Realtime Updates --- */
  useEffect(() => {
    loadWheel();

    const channel = supabase
      .channel(`realtime:prize_wheels:id=eq.${wheelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prize_wheels',
          filter: `id=eq.${wheelId}`,
        },
        (payload) => {
          console.log('🔄 Live update:', payload);
          setWheel(payload.new as PrizeWheelData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wheelId]);

  /* --- Loading --- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading Prize Wheel...
      </div>
    );
  }

  /* --- Not Found --- */
  if (!wheel) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Prize Wheel Not Found
      </div>
    );
  }

  /* --- Render --- */
  return (
    <AnimatePresence mode="wait">
      {wheel.status === 'live' ? (
        <motion.div
          key="active"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <ActivePrizeWall event={wheel} />
        </motion.div>
      ) : (
        <motion.div
          key="inactive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <InactivePrizeWall event={wheel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}