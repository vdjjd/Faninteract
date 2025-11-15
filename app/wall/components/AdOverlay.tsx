'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

interface AdOverlayProps {
  hostId: string;
}

interface AdItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  duration_seconds: number;
  is_master_ad: boolean;
  is_host_ad: boolean;
}

export default function AdOverlay({ hostId }: AdOverlayProps) {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [injectorEnabled, setInjectorEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- FETCH ADS (master + host) ---------------- */
  async function fetchAds() {
    if (!hostId) return;

    const { data } = await supabase
      .from('slide_ads')
      .select('*')
      .eq('active', true)
      .or(`master_id.is.not.null,host_profile_id.eq.${hostId}`)
      .order('is_master_ad', { ascending: false })
      .order('order_index', { ascending: true });

    if (!data) return;

    // INTERLEAVE MASTER → HOST → MASTER
    const masters = data.filter((a) => a.is_master_ad);
    const hosts = data.filter((a) => a.is_host_ad);

    const interleaved: AdItem[] = [];
    const max = Math.max(masters.length, hosts.length);

    for (let i = 0; i < max; i++) {
      if (i < masters.length) interleaved.push(masters[i]);
      if (i < hosts.length) interleaved.push(hosts[i]);
    }

    setAds(interleaved);
  }

  /* ---------- FETCH HOST SETTINGS ---------------- */
  async function fetchInjector() {
    if (!hostId) return;

    const { data } = await supabase
      .from('hosts')
      .select('injector_enabled')
      .eq('id', hostId)
      .maybeSingle();

    if (data) setInjectorEnabled(!!data.injector_enabled);
  }

  /* ---------- ROTATION ENGINE ---------------- */
  function rotate() {
    if (!injectorEnabled || ads.length === 0) return;

    const currentAd = ads[currentIndex];
    const duration = Number(currentAd.duration_seconds) || 8;

    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % ads.length);
    }, duration * 1000);
  }

  /* ---------- MAIN EFFECTS ---------------- */

  // Poll every 8 seconds (ads + injector)
  useEffect(() => {
    fetchAds();
    fetchInjector();

    const interval = setInterval(() => {
      fetchAds();
      fetchInjector();
    }, 8000);

    return () => clearInterval(interval);
  }, [hostId]);

  // Rotate ads
  useEffect(() => {
    rotate();
  }, [currentIndex, ads, injectorEnabled]);

  // Stop timer on unmount
  useEffect(() => {
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, []);

  /* ---------- NO ADS WHEN INJECTOR OFF ---------------- */
  if (!injectorEnabled || ads.length === 0) return null;

  const ad = ads[currentIndex];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      {ad.type === 'image' ? (
        <Image
          src={ad.url}
          alt="ad"
          width={1920}
          height={1080}
          style={{
            objectFit: 'contain',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      ) : (
        <video
          src={ad.url}
          autoPlay
          muted
          playsInline
          style={{
            objectFit: 'contain',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      )}
    </div>
  );
}
