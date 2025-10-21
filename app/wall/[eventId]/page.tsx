'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import InactiveWall from '@/components/InactiveWall';
import LiveWall from '@/components/LiveWall';

/* ---------- TYPES ---------- */
interface EventData {
  id: string;
  title: string | null;
  status: 'inactive' | 'live';
  countdown: string | null;
  countdown_active?: boolean;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
  qr_url: string | null;
  host_id: string;
}

interface SubmissionData {
  id: string;
  user_id: string | null;
  event_id: string | null;
  photo_url: string | null;
  message: string | null;
  nickname: string | null;
  status?: string;
  created_at: string;
}

/* ---------- MAIN PAGE ---------- */
export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) console.error('❌ Error loading event:', error);
      if (data) {
        setEvent(data);
        setShowLive(data.status === 'live');
      }
      setLoading(false);
    }
    loadEvent();
  }, [eventId]);

  /* ---------- REALTIME EVENT UPDATES (STATUS + BACKGROUND) ---------- */
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`events-realtime-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as EventData;
          console.log('🔄 Event updated:', updated);

          setEvent((prev) => ({
            ...prev,
            ...updated,
          }));

          setShowLive(updated.status === 'live');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  /* ---------- REALTIME SUBMISSIONS ---------- */
  useEffect(() => {
    if (!eventId) return;

    async function loadSubs() {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (error) console.error('❌ Error loading submissions:', error);
      if (data) setSubmissions(data);
    }

    loadSubs();

    const subsChannel = supabase
      .channel(`submissions-realtime-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as SubmissionData;

          if (updated.status === 'approved') {
            setSubmissions((prev) => {
              const exists = prev.find((p) => p.id === updated.id);
              return exists
                ? prev.map((p) => (p.id === updated.id ? updated : p))
                : [...prev, updated];
            });
          }

          if (payload.eventType === 'DELETE' || updated.status !== 'approved') {
            setSubmissions((prev) => prev.filter((p) => p.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subsChannel);
    };
  }, [eventId]);

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* ---------- LOADING ---------- */
  if (loading)
    return <p className="text-white text-center mt-20">Loading Wall …</p>;
  if (!event)
    return <p className="text-white text-center mt-20">Event not found.</p>;

  /* ---------- RENDER ---------- */
  return (
    <>
      <style>{`
        .fade-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          background: ${bg};
          overflow: hidden;
          transition: background 0.6s ease-in-out;
        }
        .fade-child {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }
        .fade-child.active {
          opacity: 1;
          z-index: 2;
        }
      `}</style>

      <div className="fade-wrapper">
        {/* ---------- INACTIVE WALL ---------- */}
        <div className={`fade-child ${!showLive ? 'active' : ''}`}>
          <InactiveWall event={event} />
        </div>

        {/* ---------- LIVE WALL ---------- */}
        <div className={`fade-child ${showLive ? 'active' : ''}`}>
          <LiveWall event={event} posts={submissions} />
        </div>
      </div>
    </>
  );
}
