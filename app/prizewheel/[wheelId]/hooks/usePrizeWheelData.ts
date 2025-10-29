'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/* ---------- TYPES ---------- */
interface HostData {
  id: string;
  email: string | null;
  branding_logo_url?: string | null;
}

interface PrizeWheelData {
  id: string;
  title: string | null;
  status: 'inactive' | 'live';
  countdown: string | null;
  countdown_active?: boolean;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
  qr_url: string | null;
  host_id: string;
  spin_speed?: 'Short' | 'Medium' | 'Long';
  updated_at?: string;
  _version?: number;
  host?: HostData | null;
}

/* ---------- HOOK ---------- */
export function usePrizeWheelData(wheelId: string | string[] | undefined) {
  const [wheel, setWheel] = useState<PrizeWheelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);
  const [spinTrigger, setSpinTrigger] = useState<number>(0);

  /* ---------- LOAD PRIZE WHEEL ---------- */
  async function loadWheel() {
    if (!wheelId) return;

    const { data, error } = await supabase
      .from('prize_wheels')
      .select(`
        *,
        host:hosts (
          id,
          email,
          branding_logo_url
        )
      `)
      .eq('id', wheelId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading prize wheel:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setWheel(data);
      setShowLive(data.status === 'live');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWheel();
  }, [wheelId]);

  /* ---------- REALTIME STATUS + SPIN ---------- */
  useEffect(() => {
    if (!wheelId) return;

    const channel = supabase
      .channel(`prizewheel-${wheelId}`)

      // 🔄 Database updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prize_wheels',
          filter: `id=eq.${wheelId}`,
        },
        (payload) => {
          const updated = payload.new as PrizeWheelData;
          if (!updated) return;
          setWheel((prev): PrizeWheelData => ({
            ...(prev ?? ({} as PrizeWheelData)),
            ...(updated as Partial<PrizeWheelData>),
            _version: Date.now(),
          }));
          setShowLive(updated.status === 'live');
        }
      )

      // 📡 Listen for broadcast triggers (e.g. spin start)
      .on('broadcast', { event: 'spin_trigger' }, () => {
        console.log('🎡 Spin trigger received!');
        setSpinTrigger(Date.now()); // update state to fire animation
      })

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wheelId]);

  return { wheel, loading, showLive, spinTrigger, reload: loadWheel };
}