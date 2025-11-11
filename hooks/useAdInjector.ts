'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface UseAdInjectorOptions {
  hostId: string;
}

export function useAdInjector({ hostId }: UseAdInjectorOptions) {
  const [ads, setAds] = useState<any[]>([]);
  const [showAd, setShowAd] = useState(false);
  const [current, setCurrent] = useState(0);

  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval] = useState(8);

  const rotationCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ------------------ LOAD SETTINGS + ADS ------------------ */
  useEffect(() => {
    if (!hostId) return;

    async function loadAll() {

      /* ✅ Load injector settings */
      const { data: hostSettings } = await supabase
        .from('hosts')
        .select('injector_enabled, trigger_interval')
        .eq('id', hostId)
        .single();

      if (hostSettings) {
        setEnabled(hostSettings.injector_enabled ?? false);
        setInterval(Number(hostSettings.trigger_interval) || 8);
      }

      /* ✅ Load ads (sorted by global_order_index ASC) */
      let { data: adList, error } = await supabase
        .from('slide_ads')
        .select('*')
        .order('global_order_index', { ascending: true });

      if (!error && adList) {
        // Remove any ads missing ordering
        adList = adList.filter((a: any) => a.global_order_index !== null);

        // Fallback sort (important)
        adList.sort((a: any, b: any) => {
          if (a.global_order_index == null) return 1;
          if (b.global_order_index == null) return -1;
          return a.global_order_index - b.global_order_index;
        });

        setAds(adList);
      }
    }

    loadAll();

    /* ✅ Listen for realtime changes */
    const channel = supabase
      .channel(`slide_ads_${hostId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slide_ads' },
        loadAll
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [hostId]);

  /* ------------------ RUN AD INJECTION ------------------ */
  const runInjection = () => {
    if (!enabled || ads.length === 0) return;

    setShowAd(true);

    const nextIndex = (current + 1) % ads.length;
    setCurrent(nextIndex);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setShowAd(false);
    }, 8000);
  };

  /* ------------------ TICK (CALLED BY WALL EACH ROTATION) ------------------ */
  const tick = () => {
    if (!enabled || ads.length === 0) return;

    rotationCount.current++;

    console.log(
      `Tick → ${rotationCount.current}/${interval} (ads: ${ads.length})`
    );

    if (rotationCount.current >= interval) {
      rotationCount.current = 0;
      runInjection();
    }
  };

  /* ------------------ CLEANUP ------------------ */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ------------------ RETURN API ------------------ */
  return {
    ads,
    showAd,
    currentAd: ads[current] || null,
    currentAdIndex: current,
    tick,
    setShowAd,
    injectorEnabled: enabled,
  };
}
