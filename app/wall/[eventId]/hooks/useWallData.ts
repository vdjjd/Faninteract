'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  layout_type?: string | null;
  updated_at?: string;
  _version?: number;
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

/* ---------- HOOK ---------- */
export function useWallData(eventId: string | string[] | undefined) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  /* ---------- LOAD EVENT ---------- */
  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('❌ Error loading event:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setEvent(data);

        // 🧠 determine visibility
        if (data.status === 'live') {
          setShowLive(true);
        } else if (data.countdown_active) {
          setShowLive(false);
        } else {
          setShowLive(false);
        }
      }

      setLoading(false);
    }

    loadEvent();
  }, [eventId]);

  /* ---------- REALTIME EVENT UPDATES ---------- */
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`events-wall-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as EventData;
          if (!updated) return;

          setEvent((prev): EventData => ({
            ...(prev ?? ({} as EventData)),
            ...(updated as Partial<EventData>),
            _version: Date.now(),
          }));

          // 🧩 determine wall visibility in real time
          if (updated.status === 'live') {
            setShowLive(true);
          } else if (updated.countdown_active) {
            setShowLive(false);
          } else {
            setShowLive(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  /* ---------- LOAD + REALTIME SUBMISSIONS ---------- */
  useEffect(() => {
    if (!eventId) return;

    async function loadSubs() {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading submissions:', error);
        return;
      }
      if (data) setSubmissions(data);
    }

    loadSubs();

    const channel = supabase
      .channel(`submissions-wall-${eventId}`)
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

          if (payload.eventType === 'DELETE') {
            setSubmissions((prev) =>
              prev.filter((p) => p.id !== payload.old.id)
            );
            return;
          }

          if (updated.status === 'approved') {
            setSubmissions((prev) => {
              const exists = prev.find((p) => p.id === updated.id);
              return exists
                ? prev.map((p) => (p.id === updated.id ? updated : p))
                : [...prev, updated];
            });
          } else {
            setSubmissions((prev) =>
              prev.filter((p) => p.id !== updated.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return { event, submissions, loading, showLive };
}