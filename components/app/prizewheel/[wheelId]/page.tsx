'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

import InactiveWall from '../components/wall/InactiveWall';
import ActiveWall from '../components/wall/ActiveWall';

/* -------------------------------------------------------------------------- */
/* 🎡 Prize Wheel Type                                                        */
/* -------------------------------------------------------------------------- */
interface PrizeWheelData {
  id: string;
  title: string | null;
  host_id: string;
  status: 'inactive' | 'live';
  background_type: string | null;
  background_value: string | null;
  logo_url: string | null;
  spin_speed?: string | null;
  countdown?: string | null;
  countdown_active?: boolean;
  host?: {
    branding_logo_url?: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/* 🎡 MAIN PAGE                                                               */
/* -------------------------------------------------------------------------- */
export default function PrizeWheelPage() {
  const { wheelId } = useParams();
  const [wheel, setWheel] = useState<PrizeWheelData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD PRIZE WHEEL ---------- */
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

  /* ---------- REALTIME UPDATES ---------- */
  useEffect(() => {
    loadWheel(); // initial load

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
          console.log('🔄 Realtime update received for Prize Wheel:', payload);
          setWheel(payload.new as PrizeWheelData);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Listening for live updates on wheel ${wheelId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wheelId]);

  /* ---------- LOADING ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading Prize Wheel...
      </div>
    );
  }

  /* ---------- FALLBACK ---------- */
  if (!wheel) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Prize Wheel not found.
      </div>
    );
  }

  /* ---------- RENDER WALLS WITH FADE TRANSITION ---------- */
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
          <ActiveWall event={wheel} />
        </motion.div>
      ) : (
        <motion.div
          key="inactive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <InactiveWall event={wheel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
