'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
/* ⚡ Optimized useWallData — smoother, flicker-free real-time updates         */
/* -------------------------------------------------------------------------- */
export function useWallData(wallId: string | string[] | undefined) {
  const [wall, setWall] = useState<WallData | null>(null);
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  const initialized = useRef(false);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  /* 🧠 Fetch wall once */
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

  /* 🚀 Initial fetch once */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /* 🌐 Real-time subscription */
  useEffect(() => {
    if (!wallId) return;

    const channelName = `fan_wall-${wallId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true, ack: false } },
    });

    console.log(`✅ Subscribed to ${channelName}`);

    // Debounced merge helper
    const scheduleUpdate = (patch: Partial<WallData>) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setWall((prev) => (prev ? { ...prev, ...patch } : prev));
      }, 120);
    };

    /* 🟢 Wall status change (Play / Stop) */
    channel.on('broadcast', { event: 'wall_status_changed' }, (payload) => {
      const data = payload.payload as {
        id: string;
        status?: string;
        countdown_active?: boolean;
      };
      if (data?.id !== wallId) return;

      // 🛑 Prevent invalid or undefined statuses from resetting the wall
      if (typeof data.status === 'undefined') return;

      const isLive = data.status === 'live';
      setShowLive(isLive);
      scheduleUpdate({
        status: isLive ? 'live' : 'inactive',
        countdown_active: data.countdown_active ?? false,
        updated_at: new Date().toISOString(),
      });
    });

    /* 🎨 Wall appearance or settings updated */
    channel.on('broadcast', { event: 'wall_updated' }, (payload) => {
      const data = payload.payload as Partial<WallData> & { id: string };
      if (data?.id !== wallId) return;
      scheduleUpdate({ ...data, updated_at: new Date().toISOString() });
    });

    /* ⏱ Countdown finished → Live */
    channel.on('broadcast', { event: 'countdown_finished' }, (payload) => {
      const data = payload.payload as { id: string };
      if (data?.id !== wallId) return;
      setShowLive(true);
      scheduleUpdate({ status: 'live', countdown_active: false });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log(`✅ Joined realtime ${wallId}`);
    });

    return () => {
      console.log(`🧹 Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [wallId]);

  /* 💬 Realtime guest posts (append-only) */
  useEffect(() => {
    if (!wallId) return;

    const guestChannel = supabase
      .channel(`guest_posts-${wallId}`)
      .on('broadcast', { event: 'new_guest_post' }, (payload) => {
        const post = payload.payload as GuestPost;
        if (post.fan_wall_id === wallId && post.status === 'approved') {
          setPosts((prev) =>
            prev.some((p) => p.id === post.id) ? prev : [...prev, post]
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(guestChannel);
    };
  }, [wallId]);

  return { wall, posts, loading, showLive, refresh };
}
