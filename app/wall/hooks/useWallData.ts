'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface EventData {
  id: string;
  title: string | null;
  status: string | null;
  countdown: string | null;
  background_type: string | null;
  background_value: string | null;
  logo_url: string | null;
  qr_url: string | null;
  transition_speed?: string | null;
  layout_type?: string | null;
}

interface SubmissionData {
  id: string;
  event_id: string;
  nickname: string | null;
  message: string | null;
  photo_url: string | null;
  status: string | null;
  created_at: string;
}

/**
 * Hook for fetching + subscribing to wall event + approved posts.
 * Keeps all walls + dashboard synced.
 */
export function useWallData(eventId: string) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [posts, setPosts] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------- INITIAL FETCH ---------- */
  useEffect(() => {
    if (!eventId) return;

    async function fetchAll() {
      setLoading(true);

      // fetch event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) console.error('Error loading event:', eventError);
      else setEvent(eventData);

      // fetch approved posts
      const { data: postData, error: postError } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (postError) console.error('Error loading posts:', postError);
      else setPosts(postData || []);

      setLoading(false);
    }

    fetchAll();
  }, [eventId]);

  /* ---------- REALTIME SUBSCRIPTION ---------- */
  useEffect(() => {
    if (!eventId) return;

    // channel for realtime changes
    const channel = supabase.channel(`wall-${eventId}`);

    // 🔁 Watch for new approved posts
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'submissions' },
      (payload: any) => {
        if (payload.new?.event_id === eventId && payload.new?.status === 'approved') {
          setPosts((prev) => [payload.new, ...prev]);
        }
      }
    );

    // 🧹 Watch for post updates (like approvals)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'submissions' },
      (payload: any) => {
        if (payload.new?.event_id !== eventId) return;
        setPosts((prev) => {
          const idx = prev.findIndex((p) => p.id === payload.new.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = payload.new;
            return copy;
          } else if (payload.new.status === 'approved') {
            return [payload.new, ...prev];
          }
          return prev;
        });
      }
    );

    // 🧩 Watch for event updates (background, countdown, etc.)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'events' },
      (payload: any) => {
        if (payload.new?.id === eventId) {
          setEvent(payload.new);
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return { event, posts, loading };
}