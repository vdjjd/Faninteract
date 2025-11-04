'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SupabaseRealtimeContext = createContext<any>(null);

// ✅ Global singleton channel (survives StrictMode)
let globalChannel: any = null;

export function SupabaseRealtimeProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (channelRef.current) return; // already set

    if (!globalChannel) {
      console.log("🛰 Creating global realtime channel...");

      globalChannel = supabase.channel("fan_walls-realtime", {
        config: { broadcast: { self: false, ack: false } },
      });

      // ✅ Monitor connection
      globalChannel.subscribe((status: string) => {
        console.log("🔔 Channel status:", status);
      });
    }

    channelRef.current = globalChannel;

    // ❌ No cleanup in dev — StrictMode double-mounts!
    if (process.env.NODE_ENV === "production") {
      return () => {
        console.log("🧹 Closing channel (prod only)");
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
