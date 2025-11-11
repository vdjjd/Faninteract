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
        setEnabled(hostSettings.injector_enabled);
        setInterval(hostSettings.trigger_interval);
      }

      // Load merged ads in playback order
      const { data: adList } = await supabase
        .from('slide_ads')
        .select('*')
        .order('global_order_index', { ascending: true });

      setAds(adList || []);
    }

    loadAll();

    // Live update when ads or settings change
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

  /* ------------------ TRIGGER AD DISPLAY ------------------ */
  const trigger = () => {
    if (!enabled || !ads.length) return;

    setShowAd(true);

    const nextIndex = (current + 1) % ads.length;
    setCurrent(nextIndex);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowAd(false), 8000);
  };

  return {
    ads,
    showAd,
    currentAd: ads[current],
    trigger,
    injectorEnabled: enabled,
  };
}
