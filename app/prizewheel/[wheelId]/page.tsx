'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import InactivePrizeWall from '@/app/prizewheel/components/wall/InactiveWall';
import ActivePrizeWall from '@/app/prizewheel/components/wall/ActiveWall';

import { cn } from '@/lib/utils';

export default function PrizeWheelRouterPage() {
  const { wheelId } = useParams();
  const id = Array.isArray(wheelId) ? wheelId[0] : wheelId;

  const [wheel, setWheel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------------------------
     ✅ Load wheel once
  ------------------------------------------------------------ */
  async function loadWheel() {
    const { data, error } = await supabase
      .from('prize_wheels')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data) setWheel(data);
    setLoading(false);
  }

  /* ------------------------------------------------------------
     ✅ Subscribe to realtime updates
        (broadcast + table changes)
  ------------------------------------------------------------ */
  useEffect(() => {
    loadWheel();

    const channel = supabase
      .channel(`prizewheel-router-${id}`, {
        config: { broadcast: { self: true } }
      })

      // ✅ 1. Listen for broadcast updates
      .on('broadcast', { event: 'prizewheel_status_changed' }, (msg) => {
        if (msg?.payload?.id === id) {
          setWheel((prev) => ({ ...prev, ...msg.payload }));
        }
      })

      .on('broadcast', { event: 'prizewheel_updated' }, (msg) => {
        if (msg?.payload?.id === id)
          setWheel((prev) => ({ ...prev, ...msg.payload }));
      })

      .on('broadcast', { event: 'spin_trigger' }, (msg) => {
        if (msg?.payload?.id === id) {
          setWheel((prev) => ({ ...prev, remote_spin: true }));
        }
      })

      // ✅ 2. Fallback if someone updates via SQL or API directly
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'prize_wheels',
          filter: `id=eq.${id}`,
          event: '*',
        },
        (payload) => {
          if (payload.new) setWheel(payload.new);
        }
      )

      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  /* ------------------------------------------------------------
     ✅ Loading states
  ------------------------------------------------------------ */
  if (loading)
    return (
      <div className={cn('text-center', 'text-white', 'p-10')}>
        Loading prize wheel…
      </div>
    );

  if (!wheel)
    return (
      <div className={cn('text-center', 'text-white', 'p-10')}>
        Prize wheel not found.
      </div>
    );

  /* ------------------------------------------------------------
     ✅ Render correct wall
  ------------------------------------------------------------ */
  return wheel.status === 'live'
    ? <ActivePrizeWall event={wheel} />
    : <InactivePrizeWall event={wheel} />;
}
