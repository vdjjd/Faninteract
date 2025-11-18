'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import InactivePrizeWall from '@/app/prizewheel/components/wall/InactiveWall';
import ActivePrizeWall from '@/app/prizewheel/components/wall/ActiveWall';

export default function PrizeWheelRouterPage() {
  const { wheelId } = useParams();
  const id = Array.isArray(wheelId) ? wheelId[0] : wheelId;

  const [wheel, setWheel] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLive, setShowLive] = useState(false);
  const previousStatus = useRef<string | null>(null);

  async function loadEverything() {
    const { data: wheelData } = await supabase
      .from('prize_wheels')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!wheelData) {
      setLoading(false);
      return;
    }

    const { data: entryData } = await supabase
      .from('wheel_entries')
      .select(`
        id,
        wheel_id,
        guest_profile_id,
        created_at,
        status,
        photo_url,
        first_name,
        last_name,
        guest_profiles (
          first_name,
          last_name
        )
      `)
      .eq('wheel_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    previousStatus.current = wheelData.status;
    setWheel(wheelData);
    setEntries(entryData || []);

    setShowLive(wheelData.status === 'live');
    setLoading(false);
  }

  useEffect(() => {
    loadEverything();

    const interval = setInterval(async () => {
      const { data: wheelData } = await supabase
        .from('prize_wheels')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!wheelData) return;

      const { data: entryData } = await supabase
        .from('wheel_entries')
        .select(`
          id,
          wheel_id,
          guest_profile_id,
          created_at,
          status,
          photo_url,
          first_name,
          last_name,
          guest_profiles (
            first_name,
            last_name
          )
        `)
        .eq('wheel_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      setEntries(entryData || []);
      setWheel(wheelData);

      // 🔥 THIS is what makes the fade work
      setShowLive(wheelData.status === 'live');
    }, 1500);

    return () => clearInterval(interval);
  }, [id]);

  if (loading)
    return <div style={{ color: 'white', padding: 40 }}>Loading…</div>;

  if (!wheel)
    return <div style={{ color: 'white', padding: 40 }}>Not found</div>;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: 'black'
      }}
    >
      {/* INACTIVE WALL LAYER */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: showLive ? 0 : 1,
          transition: 'opacity 0.6s ease',
          zIndex: 1,
        }}
      >
        <InactivePrizeWall wheel={wheel} entries={entries} />
      </div>

      {/* ACTIVE WALL LAYER */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: showLive ? 1 : 0,
          transition: 'opacity 0.6s ease',
          zIndex: 2,
        }}
      >
        <ActivePrizeWall wheel={wheel} entries={entries} />
      </div>
    </div>
  );
}
