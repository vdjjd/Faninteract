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
  const [interval, setInterval] = useState(8); // rotation count trigger

  const rotationCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ------------------ LOAD SETTINGS + ADS ------------------ */
  useEffect(() => {
    if (!hostId) return;

    async function loadAll() {
      // Load injector settings
      const { data: hostSettings } = await supabase
        .from('hosts')
        .select('injector_enabled, trigger_interval')
        .eq('id', hostId)
        .single();

      if (hostSettings) {
        setEnabled(hostSettings.injector_enabled ?? false);
        setInterval(Number(hostSettings.trigger_interval) || 8);
      }

      // Load merged ads in playback order
      const { data: adList } = await supabase
        .from('slide_ads')
        .select('*')
        .order('global_order_index', { ascending: true });

      setAds(adList || []);
    }

    loadAll();

    const channel = supabase
      .channel(`slide_ads_${hostId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slide_ads' },
        loadAll
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostId]);

  /* ------------------ INTERNAL — RUN AD OVERLAY ------------------ */
  const runInjection = () => {
    if (!enabled || ads.length === 0) return;

    setShowAd(true);

    const next = (current + 1) % ads.length;
    setCurrent(next);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowAd(false), 8000);
  };

  /* ------------------ PUBLIC: CALLED BY WALL ------------------ */
  const tick = () => {
    if (!enabled || ads.length === 0) return;

    rotationCount.current++;

    console.log(
      `Tick: ${rotationCount.current}/${interval} (enabled: ${enabled}, ads: ${ads.length})`
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

  return {
    ads,
    showAd,
    currentAd: ads[current],
    tick,                // ✅ wall must call this every rotation
    injectorEnabled: enabled,
  };
}
