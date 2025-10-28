'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ Updated imports (new folder structure)
import InactiveWall from '../components/InactiveWall';
import ActiveWall from '../components/ActiveWall';

/* ---------- Type Definition ---------- */
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

  /* --- Load wheel from Supabase --- */
  async function loadWheel() {
    if (!wheelId) return;

    console.log('🧭 Wheel ID param:', wheelId);

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
      console.log('🎯 Loaded wheel data:', data);
      setWheel(data);
    }

    setLoading(false);
  }

  /* --- Initial load + realtime updates --- */
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Listening for updates on wheel ${wheelId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wheelId]);

  /* --- Loading state --- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading Prize Wheel…
      </div>
    );
  }

  /* --- Not found --- */
  if (!wheel) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        ❌ Prize Wheel Not Found
      </div>
    );
  }

  /* --- Render the correct view --- */
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
          <ActiveWall wheel={wheel} />
        </motion.div>
      ) : (
        <motion.div
          key="inactive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <InactiveWall wheel={wheel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}