'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SupabaseRealtimeContext = createContext<any>(null);

// ✅ global singleton channel
let globalChannel: any = null;

export function SupabaseRealtimeProvider({ children }) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (channelRef.current) return; // already initialized

    // ✅ Wait 1 tick to ensure Supabase client is fully ready
    setTimeout(() => {
      if (!globalChannel) {
        console.log("🛰 Creating unified realtime channel…");

        globalChannel = supabase.channel('faninteract-realtime', {
          config: {
            // ✅ no presence (anon keys + presence = CLOSED)
            broadcast: { self: false },
          },
        });

        globalChannel.subscribe((status: string) => {
          console.log("🔔 Realtime status:", status);
        });
      }

      channelRef.current = globalChannel;
    }, 0);

    // ✅ no cleanup in dev
    if (process.env.NODE_ENV === 'production') {
      return () => {
        console.log("🧹 Removing realtime channel");
        supabase.removeChannel(globalChannel);
        globalChannel = null;
      };
    }
  }, []);

  return (
    <SupabaseRealtimeContext.Provider value={channelRef}>
      {children}
    </SupabaseRealtimeContext.Provider>
  );
}

export function useRealtimeChannel() {
  return useContext(SupabaseRealtimeContext);
}
