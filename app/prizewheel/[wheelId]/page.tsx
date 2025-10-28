'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

/* ✅ MATCH YOUR ACTUAL FILE NAMES */
import InactiveWall from '../components/wall/InactiveWall';
import ActiveWall from '../components/wall/ActiveWall';

/* -------------------------------------------------------------------------- */
/* 🎡 Prize Wheel Data Type                                                   */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* 🎡 MAIN PAGE                                                               */
/* -------------------------------------------------------------------------- */
export default function PrizeWheelPage() {
  const { wheelId } = useParams();
  const [wheel, setWheel] = useState<PrizeWheelData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD WHEEL ---------- */
  async function loadWheel() {
    console.log('🧭 Params:', wheelId);

    if (!wheelId) {
      console.warn('⚠️ No wheelId found in URL');
      return;
    }

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

    console.log('🎯 Loaded wheel data:', data);
    if (error) console.error('❌ Error loading prize wheel:', error);

    setWheel(data);
    setLoading(false);
  }

  /* ---------- REALTIME UPDATES ---------- */
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
          console.log('🔄 Live update received:', payload);
          setWheel(payload.new as PrizeWheelData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wheelId]);

  /* ---------- LOADING STATE ---------- */
  if (loading) {
    console.log('⏳ Loading Prize Wheel page...');
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading Prize Wheel...
      </div>
    );
  }

  /* ---------- NOT FOUND ---------- */
  if (!wheel) {
    console.log('🚫 Prize wheel not found or returned null');
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Prize Wheel Not Found
      </div>
    );
  }

  console.log('✅ Rendering wheel with status:', wheel.status);

  /* ---------- RENDER ---------- */
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
