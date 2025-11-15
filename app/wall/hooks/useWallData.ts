'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

/* ---------------------------------------------- */
/* CANONICAL LAYOUT                               */
/* ---------------------------------------------- */
function canonicalLayout(input?: string) {
  if (!input) return 'singleHighlight';
  const raw = input.toLowerCase();
  if (raw.includes('4x2')) return 'grid4x2';
  if (raw.includes('2x2')) return 'grid2x2';
  return 'singleHighlight';
}

/* ---------------------------------------------- */
/* MAIN POLLING HOOK                               */
/* ---------------------------------------------- */
export function useWallData(wallId: string | undefined) {
  const wallUUID = String(wallId || '').trim();

  const [wall, setWall] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLive, setShowLive] = useState(false);

  /* TRACK LAST VALUES TO AVOID UNNECESSARY SETSTATE */
  const lastWallJSON = useRef<string>('');
  const lastPostCount = useRef<number>(0);

  /* ---------------------------------------------- */
  /* REFRESH FUNCTION (called on interval + load)    */
  /* ---------------------------------------------- */
  const refresh = useCallback(async () => {
    if (!wallUUID) return;

    /* 1️⃣ FETCH WALL SETTINGS */
    const { data: wallRow } = await supabase
      .from('fan_walls')
      .select(`*, host:host_id (id, email, branding_logo_url)`)
      .eq('id', wallUUID)
      .maybeSingle();

    if (!wallRow) {
      setWall(null);
      setLoading(false);
      return;
    }

    /* Canonical layout */
    const normalized = {
      ...wallRow,
      layout_type: canonicalLayout(wallRow.layout_type),
    };

    const nextJSON = JSON.stringify(normalized);

    /* Only update React state if something actually changed */
    if (nextJSON !== lastWallJSON.current) {
      lastWallJSON.current = nextJSON;
      setWall(normalized);

      /* update showLive when status changes */
      setShowLive(wallRow.status === 'live');
    }

    /* 2️⃣ FETCH POSTS */
    const { data: postRows } = await supabase
      .from('guest_posts')
      .select('*')
      .eq('fan_wall_id', wallUUID)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    const newCount = postRows?.length || 0;

    if (newCount !== lastPostCount.current) {
      lastPostCount.current = newCount;
      setPosts(postRows || []);
    }

    setLoading(false);
  }, [wallUUID]);

  /* ---------------------------------------------- */
  /* INITIAL LOAD + POLLING                         */
  /* ---------------------------------------------- */
  useEffect(() => {
    refresh(); // load immediately

    const interval = setInterval(refresh, 3000); // poll every 3 sec
    return () => clearInterval(interval);
  }, [refresh]);

  /* ---------------------------------------------- */
  /* RETURN DATA                                     */
  /* ---------------------------------------------- */
  return {
    wall,
    posts,
    loading,
    showLive,
    refresh,
  };
}
