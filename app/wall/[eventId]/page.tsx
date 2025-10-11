'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface EventData {
  id: string;
  title: string | null;
  status: 'inactive' | 'live';
  countdown: string | null;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
  qr_url: string | null;
  host_id: string;
}

export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------- FETCH EVENT ----------------
  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;
      const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (data) setEvent(data);
      setLoading(false);
    }
    loadEvent();
  }, [eventId]);

  // ---------------- BACKGROUND HELPER ----------------
  const getBackground = (bg?: string, type?: string | null) => {
    if (!bg) return 'linear-gradient(to bottom right, #1b2735, #090a0f)';
    if (type === 'image') return `url(${bg}) center/cover no-repeat`;
    return bg;
  };

  // ---------------- RENDER ----------------
  if (loading) return <p className="text-white text-center mt-20">Loading Wall...</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  return (
    <div
      style={{
        background: getBackground(event.background_value ?? '', event.background_type),
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    ></div>
  );
}
