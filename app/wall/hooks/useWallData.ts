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
  const [wall, setWall] = useState<WallData | null>(null);
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  const channelRef = useRealtimeChannel();
  const initialized = useRef(false);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  /* ---------------------------------------------------------------------- */
  /* 🔄 Initial Load                                                        */
  /* ---------------------------------------------------------------------- */
  const refresh = useCallback(async () => {
    if (!wallId) return;
    if (!initialized.current) setLoading(true);

    const { data, error } = await supabase
      .from('fan_walls')
      .select(`*, host:hosts (id,email,branding_logo_url)`)
      .eq('id', wallId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading fan wall:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setWall((prev) => (!prev ? data : { ...prev, ...data }));
      setShowLive(data.status === 'live');
    }

    setLoading(false);
    initialized.current = true;
  }, [wallId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ---------------------------------------------------------------------- */
  /* 🛰 Broadcast Listener                                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !wallId) return;

    console.log('🛰 useWallData subscribing to global realtime channel…');

    const scheduleUpdate = (patch: Partial<WallData>) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setWall((prev) => (prev ? { ...prev, ...patch } : prev));
      }, 50);
    };

    const handleMessage = (payload: any) => {
      const { event, payload: data } = payload;
      if (!data?.id || data.id !== wallId) return;

      console.log('📡 Broadcast received:', event, data);

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
          console.warn('🗑️ Wall deleted remotely:', data.id);
          setWall(null);
          break;
      }
    };

    channel.on('broadcast', {}, handleMessage);

    // ✅ This line was missing — actually joins the channel
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ useWallData joined global realtime channel for wall: ${wallId}`);
      }
    });

    return () => {
      try {
        channel.unsubscribe?.();
      } catch (err) {
        console.warn('🧹 Channel cleanup failed:', err);
      }
    };
  }, [channelRef, wallId]);

  return { wall, posts, loading, showLive, refresh };
}

