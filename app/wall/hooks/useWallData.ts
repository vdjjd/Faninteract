'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* TYPES */
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

  /* ✅ Load wall */
  const refresh = useCallback(async () => {
    if (!wallUUID) return;
    if (!initialized.current) setLoading(true);

    const { data, error } = await supabase
      .from('fan_walls')
      .select(`*, host:host_id (id, email, branding_logo_url)`)
      .eq('id', wallUUID)
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading fan wall:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      console.warn("⚠️ No wall found:", wallUUID);
      setWall(null);
      setLoading(false);
      return;
    }

    setWall(prev => (!prev ? data : { ...prev, ...data }));
    setShowLive(data.status === 'live');
    setLoading(false);
    initialized.current = true;
  }, [wallUUID]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ✅ Load APPROVED posts */
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

  /* ✅ NEW — Realtime guest_posts using global channel */
  useEffect(() => {
    if (!wallUUID) return;
    if (!channelRef?.current) return;

    const channel = channelRef.current;

    const upsertPost = (row: any) => {
      if (!row) return;
      if (row.fan_wall_id !== wallUUID) return;
      if (row.status !== "approved") return;

      setPosts(prev => {
        const exists = prev.find(p => p.id === row.id);
        if (exists) return prev.map(p => (p.id === row.id ? row : p));
        return [row, ...prev];
      });
    };

    const removePost = (row: any) => {
      setPosts(prev => prev.filter(p => p.id !== row?.id));
    };

    /* INSERT */
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "guest_posts",
        filter: `fan_wall_id=eq.${wallUUID}`
      },
      payload => {
        const row = payload.new;
        if (row?.status === "approved") upsertPost(row);
      }
    );

    /* UPDATE */
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "guest_posts",
        filter: `fan_wall_id=eq.${wallUUID}`
      },
      payload => {
        const row = payload.new;
        const old = payload.old;

        if (row?.status === "approved") upsertPost(row);

        if (old?.status === "approved" && row?.status !== "approved") {
          removePost(row);
        }
      }
    );

    /* DELETE */
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "guest_posts",
        filter: `fan_wall_id=eq.${wallUUID}`
      },
      payload => removePost(payload.old)
    );

  }, [wallUUID, channelRef]);

  /* ✅ Listen for wall broadcasts */
  useEffect(() => {
    const channel = channelRef?.current;
    if (!channel || !wallUUID) return;

    const scheduleUpdate = (patch: Partial<WallData>) => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(() => {
        setWall(prev => (prev ? { ...prev, ...patch } : prev));
      }, 50);
    };

    channel.on("broadcast", {}, msg => {
      const { event, payload } = msg;
      if (!payload?.id || payload.id !== wallUUID) return;

      switch (event) {
        case "wall_updated":
          scheduleUpdate(payload);
          break;

        case "wall_status_changed":
          setShowLive(payload.status === "live");
          scheduleUpdate({ status: payload.status });
          break;

        case "countdown_finished":
          setShowLive(true);
          scheduleUpdate({ countdown_active: false });
          break;

        case "wall_deleted":
          setWall(null);
          break;
      }
    });

  }, [channelRef, wallUUID]);

  return { wall, posts, loading, showLive, refresh };
}
