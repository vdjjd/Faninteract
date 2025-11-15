'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface UseAdInjectorOptions {
  hostId: string;
}

/**
 * ADS INJECTOR — MIXED CORPORATE + HOST ADS (FINAL)
 *
 *  ✔ Corporate ads come from slide_ads where master_id = host.master_id
 *  ✔ Local ads come from slide_ads where host_profile_id = host.id
 *  ✔ Unified sort order = corporate first, then local
 *      ORDER BY is_master_ad DESC, order_index ASC
 *  ✔ Corporate ads locked from editing
 *  ✔ Supports 3 modes: rotation, slideshow, takeover
 *  ✔ Handles realtime updates cleanly
 */
export function useAdInjector({ hostId }: UseAdInjectorOptions) {
  const [ads, setAds] = useState<any[]>([]);
  const [showAd, setShowAd] = useState(false);
  const [current, setCurrent] = useState(0);

  const [injectorEnabled, setInjectorEnabled] = useState(false);
  const [triggerInterval, setTriggerInterval] = useState(8);
  const [injectorMode, setInjectorMode] =
    useState<'rotation' | 'slideshow' | 'takeover'>('rotation');

  const masterIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef(0);

  /* --------------------------------------------------------------------
     LOAD HOST SETTINGS + BOTH AD TYPES
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (!hostId) return;

    async function loadAll() {
      /** 1. Load host settings including master_id */
      const { data: host } = await supabase
        .from('hosts')
        .select('injector_enabled, trigger_interval, injector_mode, master_id')
        .eq('id', hostId)
        .single();

      if (host) {
        setInjectorEnabled(!!host.injector_enabled);
        setTriggerInterval(Number(host.trigger_interval) || 8);
        setInjectorMode(host.injector_mode || 'rotation');
        masterIdRef.current = host.master_id || null;
      }

      /** 2. Load local ads */
      const { data: localAds } = await supabase
        .from('slide_ads')
        .select('*')
        .eq('host_profile_id', hostId)
        .eq('active', true)
        .order('order_index', { ascending: true });

      /** 3. Load corporate ads (same table, master_id column) */
      let corporateAds: any[] = [];

      if (masterIdRef.current) {
        const { data: corp } = await supabase
          .from('slide_ads')
          .select('*')
          .eq('master_id', masterIdRef.current)
          .eq('active', true)
          .order('order_index', { ascending: true });

        corporateAds =
          (corp || []).map(a => ({
            ...a,
            locked: true, // mark for UI
          })) || [];
      }

      /** 4. Merge using SQL sort rules */
      const merged = [...(corporateAds || []), ...(localAds || [])].sort((a, b) => {
        // Corporate first (is_master_ad DESC)
        if (a.master_id && !b.master_id) return -1;
        if (!a.master_id && b.master_id) return 1;

        // Within group, use order_index
        return (a.order_index ?? 9999) - (b.order_index ?? 9999);
      });

      setAds(merged);
    }

    loadAll();

    /* realtime — local host ads */
    const localChannel = supabase
      .channel(`slide_ads_local_${hostId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slide_ads', filter: `host_profile_id=eq.${hostId}` },
        () => loadAll()
      )
      .subscribe();

    /* realtime — corporate ads */
    const corpChannel = supabase
      .channel(`slide_ads_corp_${hostId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slide_ads' },
        payload => {
          if (payload.new?.master_id === masterIdRef.current) loadAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(localChannel);
      supabase.removeChannel(corpChannel);
    };
  }, [hostId]);

  /* --------------------------------------------------------------------
     AD SWITCHER
  -------------------------------------------------------------------- */
  const showNextAd = () => {
    if (!injectorEnabled || ads.length === 0) return;

    setCurrent(prev => {
      const next = (prev + 1) % ads.length;
      return next;
    });

    setShowAd(true);
  };

  /* --------------------------------------------------------------------
     TAKEOVER MODE (always showing ads)
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (injectorMode !== 'takeover') return hideAndClear();
    if (!injectorEnabled || ads.length === 0) return hideAndClear();

    setShowAd(true); // permanent

    restartInterval(() => showNextAd(), triggerInterval * 1000);

    return clearIntervalOnly;
  }, [injectorMode, injectorEnabled, ads.length, triggerInterval]);

  /* --------------------------------------------------------------------
     SLIDESHOW MODE (timed show + hide)
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (injectorMode !== 'slideshow') return hideAndClear();
    if (!injectorEnabled || ads.length === 0) return hideAndClear();

    restartInterval(() => {
      showNextAd();
      setTimeout(() => setShowAd(false), 8000);
    }, triggerInterval * 1000);

    return clearIntervalOnly;
  }, [injectorMode, injectorEnabled, ads.length, triggerInterval]);

  /* --------------------------------------------------------------------
     ROTATION MODE (wall-driven tick)
  -------------------------------------------------------------------- */
  const tick = () => {
    if (injectorMode !== 'rotation') return;
    if (!injectorEnabled || ads.length === 0) return;
    if (showAd) return;

    rotationRef.current++;

    if (rotationRef.current >= triggerInterval) {
      rotationRef.current = 0;
      showNextAd();
      setTimeout(() => setShowAd(false), 8000);
    }
  };

  /* UTILITIES --------------------------------------------------------- */
  function restartInterval(fn: () => void, ms: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fn, ms);
  }

  function clearIntervalOnly() {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function hideAndClear() {
    setShowAd(false);
    clearIntervalOnly();
  }

  return {
    ads,
    showAd,
    currentAd: ads[current] || null,
    injectorEnabled,
    injectorMode,
    tick,
  };
}
