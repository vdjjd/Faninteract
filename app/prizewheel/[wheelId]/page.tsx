'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import InactiveWall from '@/app/prizewheel/components/wall/InactiveWall'; // ✅ your new file

// (Future) — when you create the live spinning wall, import it here:
// import ActiveWall from '@/app/prizewheel/components/wall/ActiveWall';

interface PrizeWheelData {
  id: string;
  title: string | null;
  host_id: string;
  status: 'inactive' | 'live';
  background_type: string | null;
  background_value: string | null;
  logo_url: string | null;
  countdown?: string | null;
  countdown_active?: boolean;
  host?: {
    branding_logo_url?: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/* 🎡 MAIN PAGE                                                                */
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
      .select(`
        *,
        host:hosts (
          branding_logo_url
        )
      `)
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
    loadWheel();

    const channel = supabase
      .channel(`prizewheel-${wheelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prize_wheels',
          filter: `id=eq.${wheelId}`,
        },
        (payload) => {
          const updated = payload.new as PrizeWheelData;
          setWheel(updated);
        }
      )
      .subscribe();

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

  /* ---------- RENDER WALL ---------- */
  if (wheel.status === 'live') {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        {/* 🔮 Placeholder for Live Wheel display */}
        <h1 className="text-4xl font-bold">🎡 Prize Wheel Live Mode Coming Soon</h1>
      </div>
    );
  }

  // Default to inactive wall
  return <InactiveWall event={wheel} />;
}