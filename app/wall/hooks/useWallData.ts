'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧩 TYPES                                                                  */
/* -------------------------------------------------------------------------- */
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
  updated_at?: string;
  _version?: number;
  host?: HostData | null;
}

interface GuestPost {
  id: string;
  fan_wall_id: string;
  guest_profile_id?: string | null;
  nickname?: string | null;
  message?: string | null;
  photo_url?: string | null;
  status?: string;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* 🧠 useWallData — Centralized Fan Wall Hook                                */
/* -------------------------------------------------------------------------- */
export function useWallData(wallId: string | string[] | undefined) {
  const [wall, setWall] = useState<WallData | null>(null);
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* 📥 INITIAL LOAD — Fan Wall                                             */
  /* ---------------------------------------------------------------------- */
  async function loadWall() {
    if (!wallId) return;

    const { data, error } = await supabase
      .from('fan_walls')
      .select(
        `
        *,
        host:hosts (
          id,
          email,
          branding_logo_url
        )
      `
      )
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
  }

  useEffect(() => {
    loadWall();
  }, [wallId]);

  /* ---------------------------------------------------------------------- */
  /* 🔄 REALTIME — Fan Wall Status Updates                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!wallId) return;

    const channel = supabase
      .channel(`fanwall-${wallId}`)
      // ✅ Listen for live DB updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fan_walls',
          filter: `id=eq.${wallId}`,
        },
        (payload) => {
          const updated = payload.new as WallData;
          if (!updated) return;

          setWall((prev) => ({
            ...(prev ?? ({} as WallData)),
            ...(updated as Partial<WallData>),
            _version: Date.now(),
          }));

          setShowLive(updated.status === 'live');
        }
      )
      // ✅ Listen for broadcast updates from dashboard
      .on('broadcast', { event: 'UPDATE' }, async (payload) => {
        const data = payload.payload as { id: string };
        if (data?.id === wallId) await loadWall();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallId]);

  /* ---------------------------------------------------------------------- */
  /* 📸 REALTIME — Guest Posts                                              */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!wallId) return;

    async function loadPosts() {
      const { data, error } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('fan_wall_id', wallId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading guest_posts:', error);
        return;
      }

      if (data) setPosts(data);
    }

    loadPosts();

    const channel = supabase
      .channel(`guestposts-${wallId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_posts',
          filter: `fan_wall_id=eq.${wallId}`,
        },
        (payload) => {
          const updated = payload.new as GuestPost;
          const deleted = payload.old as GuestPost;

          if (payload.eventType === 'DELETE') {
            setPosts((prev) => prev.filter((p) => p.id !== deleted.id));
            return;
          }

          if (updated.status === 'approved') {
            setPosts((prev) => {
              const exists = prev.find((p) => p.id === updated.id);
              return exists
                ? prev.map((p) => (p.id === updated.id ? updated : p))
                : [...prev, updated];
            });
          } else {
            // Remove anything that’s not approved
            setPosts((prev) => prev.filter((p) => p.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallId]);

  return { wall, posts, loading, showLive };
}
