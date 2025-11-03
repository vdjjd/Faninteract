'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

/* -------------------------------------------------------------------------- */
/* 🧠 useWallData — unified realtime wall sync                                */
/* -------------------------------------------------------------------------- */
export function useWallData(wallId: string | string[] | undefined) {
  const [wall, setWall] = useState<WallData | null>(null);
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  /* 🔄 Fetch wall */
  const refresh = useCallback(async () => {
    if (!wallId) return;
    setLoading(true);

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
      setWall(data);
      setShowLive(data.status === 'live');
    }
    setLoading(false);
  }, [wallId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* 🌐 GLOBAL REALTIME CHANNEL */
  useEffect(() => {
    if (!wallId) return;

    const channel = supabase.channel('global-fan-walls', {
      config: { broadcast: { self: true, ack: true } },
    });

    // 🟢 Wall start/stop & countdown trigger
    channel.on('broadcast', { event: 'wall_status_changed' }, (payload) => {
      const data = payload.payload as {
        id: string;
        status?: string;
        countdown_active?: boolean;
      };
      if (data?.id !== wallId) return;

      console.log('📡 Status broadcast received:', data);
      setShowLive(data.status === 'live');
      setWall((prev) =>
        prev
          ? {
              ...prev,
              status: (data.status as 'live' | 'inactive') ?? prev.status,
              countdown_active:
                data.countdown_active ?? prev.countdown_active ?? false,
            }
          : prev
      );
    });

    // 🎨 Any live setting update (titles, backgrounds, layouts, countdowns, etc.)
    channel.on('broadcast', { event: 'wall_updated' }, (payload) => {
      const data = payload.payload as Partial<WallData> & { id: string };
      if (data?.id !== wallId) return;
      console.log('🎨 Live update received:', data);

      setWall((prev) => {
        if (!prev) return prev;

        const stopExplicit =
          data.status === 'inactive' &&
          payload?.payload?.source === 'stop_command';

        const safeStatus =
          prev.status === 'live' && !stopExplicit && (!data.status || data.status === 'inactive')
            ? 'live'
            : data.status || prev.status;

        const merged = {
          ...prev,
          ...data,
          status: safeStatus,
          updated_at: new Date().toISOString(),
        };

        return { ...merged };
      });
    });

    // 🕒 Countdown finished (fade trigger)
    channel.on('broadcast', { event: 'countdown_finished' }, (payload) => {
      const data = payload.payload as { id: string };
      if (data?.id !== wallId) return;

      console.log('⏱ Countdown finished → activating wall');
      setShowLive(true);
      setWall((prev) =>
        prev
          ? {
              ...prev,
              status: 'live',
              countdown_active: false,
            }
          : prev
      );
    });

    // ✅ Subscribe safely (no async return)
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED')
        console.log('✅ Listening for realtime wall updates on', wallId);
    });

    // ✅ Proper cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallId]);

  /* 🧩 Guest posts listener */
  useEffect(() => {
    if (!wallId) return;

    const channel = supabase
      .channel(`guest_posts-${wallId}`)
      .on('broadcast', { event: 'new_guest_post' }, (payload) => {
        const post = payload.payload as GuestPost;
        if (post.fan_wall_id === wallId && post.status === 'approved') {
          setPosts((prev) => [...prev, post]);
        }
      });

    // ✅ subscribe safely
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED')
        console.log(`✅ Listening for guest posts on wall ${wallId}`);
    });

    // ✅ cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallId]);

  return { wall, posts, loading, showLive, refresh };
}
