'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AdInjectorOptions {
  hostId: string;
  triggerInterval: number; // how many post rotations before ad trigger
}

export function useAdInjector({ hostId, triggerInterval: defaultTrigger }: AdInjectorOptions) {
  const [ads, setAds] = useState<any[]>([]);
  const [showAd, setShowAd] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [injectorEnabled, setInjectorEnabled] = useState(false);
  const [activeTriggerInterval, setActiveTriggerInterval] = useState(defaultTrigger || 8);

  const rotationCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ------------------ LOAD HOST SETTINGS + ADS ------------------ */
  useEffect(() => {
    if (!hostId) return;

    async function loadSettings() {
      const { data, error } = await supabase
        .from('hosts')
        .select('injector_enabled, trigger_interval')
        .eq('id', hostId)
        .single();

      if (error) console.error('Error loading injector settings:', error);

      if (data) {
        setInjectorEnabled(data.injector_enabled ?? false);

        // ✅ Only override interval if explicitly set and > 0
        if (data.trigger_interval && Number(data.trigger_interval) > 0) {
          setActiveTriggerInterval(Number(data.trigger_interval));
        } else {
          setActiveTriggerInterval(defaultTrigger || 8);
        }
      }
    }

    async function loadAds() {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('host_profile_id', hostId)
        .eq('active', true)
        .order('order_index', { ascending: true });
      if (error) console.error('Error loading ads:', error);
      setAds(data || []);
    }

    loadSettings();
    loadAds();

    // ✅ Realtime host + ads updates
    const hostCh = supabase
      .channel(`hosts_${hostId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'hosts', filter: `id=eq.${hostId}` },
        (payload) => {
          const enabled = payload.new?.injector_enabled ?? false;
          setInjectorEnabled(enabled);

          if (!enabled) {
            // ✅ Reset instantly when turned off
            setShowAd(false);
            rotationCount.current = 0;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }

          // ✅ Update interval dynamically if host changes it
          const newInterval = Number(payload.new?.trigger_interval);
          if (newInterval && newInterval > 0) {
            setActiveTriggerInterval(newInterval);
          }
        }
      )
      .subscribe();

    const adsCh = supabase
      .channel(`ads_${hostId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ads', filter: `host_profile_id=eq.${hostId}` },
        loadAds
      )
      .subscribe();

    // ✅ Listen for dashboard broadcast events
    const broadcastCh = supabase
      .channel('fan_wall_broadcast')
      .on('broadcast', { event: 'injector_toggled' }, (msg) => {
        const { host_id, enabled } = msg.payload || {};
        if (host_id !== hostId) return;

        setInjectorEnabled(enabled);

        if (!enabled) {
          setShowAd(false);
          rotationCount.current = 0;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(hostCh);
      supabase.removeChannel(adsCh);
      supabase.removeChannel(broadcastCh);
    };
  }, [hostId, defaultTrigger]);

  /* ------------------ HANDLE POST ROTATION TICK ------------------ */
  const handlePostRotationTick = () => {
  if (!injectorEnabled || !ads.length) return;

  rotationCount.current++;

  console.log('🧮 Tick:', {
    rotation: rotationCount.current,
    activeTriggerInterval,
    defaultTrigger,
    injectorEnabled,
    adsCount: ads.length,
  });

  if (rotationCount.current >= activeTriggerInterval) {
    console.log('🚀 Triggering ad overlay!');
    rotationCount.current = 0;
    triggerAdOverlay();
  }
};

  /* ------------------ SHOW AD OVERLAY ------------------ */
  const triggerAdOverlay = () => {
    if (showAd || !ads.length) return;

    const ad = ads[currentAdIndex];
    if (!ad) return;

    setShowAd(true);
    const nextIndex = (currentAdIndex + 1) % ads.length;
    setCurrentAdIndex(nextIndex);

    // ✅ Adjust for fade-in/out of 1.2s each
    const FADE_DURATION = 1200;
    const baseDuration =
      ad.type === 'video'
        ? Math.min(Number(ad.duration_seconds || 15) * 1000, 15000)
        : 8000; // images show for 8s

    const totalDuration = baseDuration + FADE_DURATION * 2; // fade in/out padding

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowAd(false);
    }, totalDuration);
  };

  /* ------------------ CLEANUP ------------------ */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ------------------ RETURN ------------------ */
  return {
    ads,
    showAd,
    currentAdIndex,
    injectorEnabled,
    setShowAd,
    handlePostRotationTick,
  };
}
