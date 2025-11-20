'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SlideAd {
  id: string;
  master_id: string | null;
  host_profile_id: string | null;
  url: string;
  type: 'image' | 'video';
  active: boolean;
  order_index: number | null;
  global_order_index: number | null;
}

export function useAdOverlayer(hostId?: string) {
  const [ads, setAds] = useState<SlideAd[]>([]);
  const [showAd, setShowAd] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const submissionCount = useRef(0);
  const pauseFlag = useRef(false);

  const adsReady = useRef(false);            // <— NEW
  const adsLengthRef = useRef(0);            // <— NEW

  const settingsRef = useRef({
    ad_every_x_submissions: 8,
    ad_duration_seconds: 8,
    injector_enabled: false,
    ad_overlay_transition: "Fade In / Fade Out",
  });

  const masterIdRef = useRef<string | null>(null);

  /* =========================================================
     LOGGING
  ========================================================= */
  useEffect(() => {
    console.log("%cOVERLAYER> ads loaded:", "color:#00eaff", ads);
    adsLengthRef.current = ads.length;      // <— update ref
    adsReady.current = ads.length > 0;      // <— update readiness
  }, [ads]);

  /* =========================================================
     LOAD HOST SETTINGS
  ========================================================= */
  async function loadHostSettings() {
    if (!hostId) return;

    const { data, error } = await supabase
      .from("hosts")
      .select("ad_every_x_submissions, ad_duration_seconds, injector_enabled, ad_overlay_transition, master_id")
      .eq("id", hostId)
      .single();

    if (error) return;

    masterIdRef.current = data.master_id;

    settingsRef.current = {
      ad_every_x_submissions: data.ad_every_x_submissions ?? 8,
      ad_duration_seconds: data.ad_duration_seconds ?? 8,
      injector_enabled: data.injector_enabled ?? false,
      ad_overlay_transition: data.ad_overlay_transition ?? "Fade In / Fade Out",
    };

    await loadAds(masterIdRef.current, hostId);
  }

  /* =========================================================
     LOAD ADS
  ========================================================= */
  async function loadAds(masterId: string | null, hostId: string) {
    const filter = masterId
      ? `host_profile_id.eq.${hostId},master_id.eq.${masterId}`
      : `host_profile_id.eq.${hostId},master_id.is.null`;

    const { data } = await supabase
      .from("slide_ads")
      .select("*")
      .or(filter)
      .eq("active", true);

    if (!data) return;

    const sorted = data.sort((a, b) => {
      const ag = a.global_order_index ?? 9999;
      const bg = b.global_order_index ?? 9999;
      return ag - bg;
    });

    setAds(sorted);
  }

  /* =========================================================
     TICK — FIXED CLOSURE BUG
  ========================================================= */
  function tickSubmissionDisplayed() {
    console.log("OVERLAYER> TICK called");

    const s = settingsRef.current;

    if (!s.injector_enabled) return;

    // FIX — use ref instead of stale closure variable
    if (!adsReady.current || adsLengthRef.current === 0) {
      console.log("OVERLAYER> no ads loaded (ref check)");
      return;
    }

    if (pauseFlag.current) return;

    submissionCount.current++;

    if (submissionCount.current >= s.ad_every_x_submissions) {
      submissionCount.current = 0;
      triggerAdOverlay();
    }
  }

  /* =========================================================
     SHOW AD
  ========================================================= */
  function triggerAdOverlay() {
    const s = settingsRef.current;

    pauseFlag.current = true;
    setShowAd(true);

    setCurrentIndex(prev =>
      (prev + 1) % adsLengthRef.current   // <— use ref not stale state
    );

    setTimeout(() => {
      setShowAd(false);
      pauseFlag.current = false;
    }, s.ad_duration_seconds * 1000);
  }

  /* =========================================================
     LISTENERS
  ========================================================= */
  useEffect(() => {
    if (!hostId) return;

    loadHostSettings();

    const adsChannel = supabase
      .channel(`slide_ads:${hostId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "slide_ads" }, () =>
        loadAds(masterIdRef.current, hostId)
      )
      .subscribe();

    const hostChannel = supabase
      .channel(`hosts:${hostId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hosts", filter: `id=eq.${hostId}` }, loadHostSettings)
      .subscribe();

    return () => {
      supabase.removeChannel(adsChannel);
      supabase.removeChannel(hostChannel);
    };
  }, [hostId]);

  return {
    ads,
    showAd,
    currentAd: ads[currentIndex] ?? null,
    tickSubmissionDisplayed,
    pauseFlag,
    adTransition: settingsRef.current.ad_overlay_transition,
  };
}
