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

  const previousStatus = useRef<string | null>(null);

  async function loadEverything() {
    /* ✅ Load the wheel */
    const { data: wheelData } = await supabase
      .from('prize_wheels')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!wheelData) {
      setLoading(false);
      return;
    }

    /* ✅ Load APPROVED entries WITH guest_profiles join */
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
          last_name,
          photo_url,
          avatar_url
        )
      `)
      .eq('wheel_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    previousStatus.current = wheelData.status;
    setWheel(wheelData);
    setEntries(entryData || []);

    setLoading(false);
  }

  useEffect(() => {
    loadEverything();

    /* ✅ Poll for updates */
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
            last_name,
            photo_url,
            avatar_url
          )
        `)
        .eq('wheel_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      setEntries(entryData || []);

      if (previousStatus.current !== wheelData.status) {
        previousStatus.current = wheelData.status;
        setWheel(wheelData);
      } else {
        setWheel(wheelData);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [id]);

  if (loading)
    return <div style={{ color: 'white', padding: 40 }}>Loading…</div>;

  if (!wheel)
    return <div style={{ color: 'white', padding: 40 }}>Not found</div>;

  const isLive = wheel.status === 'live';

  return (
    <>
      {isLive ? (
        <ActivePrizeWall wheel={wheel} entries={entries} />
      ) : (
        <InactivePrizeWall wheel={wheel} entries={entries} />
      )}
    </>
  );
}
