'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * 🛰 Shared realtime channel provider
 * Creates ONE persistent Supabase broadcast channel for the whole app.
 * All components can reuse this without creating duplicate websocket connections.
 */

type RealtimeContextType = React.MutableRefObject<any> | null;
const RealtimeContext = createContext<RealtimeContextType>(null);

export function useRealtimeChannel() {
  return useContext(RealtimeContext);
}

export function SupabaseRealtimeProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Create a single global channel for all FanInteract components
    const channel = supabase.channel('global-fan-walls', {
      config: { broadcast: { self: true, ack: false } },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('✅ Global realtime channel ready');
    });

    channelRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up global channel');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={channelRef}>
      {children}
    </RealtimeContext.Provider>
  );
}
