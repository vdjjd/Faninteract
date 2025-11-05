'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

interface HostData {
  id: string;
  email: string | null;
  branding_logo_url?: string | null;
}

interface WallData {
  id: string;
  host_id: string;
  title: string | null;
  host_title: string | null;
  status: 'inactive' | 'live';
  countdown: string | null;
  countdown_active?: boolean;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  qr_url?: string | null;
  layout_type?: string | null;
  post_transition?: string | null;
  transition_speed?: string | null;
  auto_delete_minutes?: number | null;
  updated_at?: string;
  host?: HostData | null;
}

interface GuestPost {
  id: string;
  fan_wall_id: string;
  nickname?: string | null;
  message?: string | null;
  photo_url?: string | null;
  status?: string;
  created_at: string;
}

export function useWallData(wallId: string | string[] | undefined) {
  const wallUUID = Array.isArray(wallId) ? wallId[0] : wallId;

  const [wall, setWall] = useState<WallData | null>(null);
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  const channelRef = useRealtimeChannel();
  const initialized = useRef(false);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  /* ---------------------------------------------------------------------- */
  /* ✅ Load Wall Info                                                      */
  /* ---------------------------------------------------------------------- */
  const refresh = useCallback(async () => {
    if (!wallUUID) return;
    if (!initialized.current) setLoading(true);

    const { data, error } = await supabase
      .from('fan_walls')
      .select(`*, host:host_id (id,email,branding_logo_url)`)
      .eq('id', wallUUID)
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading fan wall:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      console.warn("⚠️ No wall found for id:", wallUUID);
      setWall(null);
      setLoading(false);
      return;
    }

    setWall((prev) => (!prev ? data : { ...prev, ...data }));
    setShowLive(data.status === 'live');

    setLoading(false);
    initialized.current = true;
  }, [wallUUID]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Load approved posts                                                 */
  /* ---------------------------------------------------------------------- */
  const loadPosts = useCallback(async () => {
    if (!wallUUID) return;

    const { data, error } = await supabase
      .from('guest_posts')
      .select('*')
      .eq('fan_wall_id', wallUUID)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) setPosts(data);
  }, [wallUUID]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Listen for realtime post changes                                   */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!wallUUID) return;

    const channel = supabase
      .channel(`wall_posts_${wallUUID}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guest_posts',
        filter: `fan_wall_id=eq.${wallUUID}`,
      }, (payload: any) => {
        const p = payload.new;

        if (payload.eventType === 'INSERT' && p.status === 'approved') {
          setPosts((old) => [p, ...old]);
        }
        if (payload.eventType === 'UPDATE') {
          setPosts((old) =>
            old.map((post) => (post.id === p.id ? p : post))
          );
        }
        if (payload.eventType === 'DELETE') {
          setPosts((old) => old.filter((post) => post.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallUUID]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Listen for wall broadcast events                                    */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !wallUUID) return;

    const scheduleUpdate = (patch: Partial<WallData>) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setWall((prev) => (prev ? { ...prev, ...patch } : prev));
      }, 50);
    };

    const handleMessage = (payload: any) => {
      const { event, payload: data } = payload;
      if (!data?.id || data.id !== wallUUID) return;

      switch (event) {
        case 'wall_updated':
          scheduleUpdate({ ...data });
          break;
        case 'wall_status_changed':
          setShowLive(data.status === 'live');
          scheduleUpdate({ status: data.status });
          break;
        case 'countdown_finished':
          setShowLive(true);
          scheduleUpdate({ countdown_active: false });
          break;
        case 'wall_deleted':
          setWall(null);
          break;
      }
    };

    channel.on('broadcast', {}, handleMessage);
    channel.subscribe();

    return () => {
      try {
        channel.unsubscribe?.();
      } catch {}
    };
  }, [channelRef, wallUUID]);

  return { wall, posts, loading, showLive, refresh };
}
