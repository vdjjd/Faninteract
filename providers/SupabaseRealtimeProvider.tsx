'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SupabaseRealtimeContext = createContext<any>(null);

// ✅ Singleton channel
let globalChannel: any = null;

export function SupabaseRealtimeProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (channelRef.current) return; // already setup

    if (!globalChannel) {
      console.log('🛰 Creating global realtime channel...');

      globalChannel = supabase.channel('faninteract-realtime', {
        config: { broadcast: { self: false } },
      });

      // ✅ LISTEN TO ALL guest_posts CHANGES
      globalChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guest_posts',
          },
          (payload) => {
            console.log('🔥 GLOBAL guest_posts event:', payload);
          }
        )
        .subscribe((status: string) => {
          console.log('🔔 Realtime status:', status);
        });
    }

    channelRef.current = globalChannel;

    // ❌ Never cleanup in dev (StrictMode double-mount)
    if (process.env.NODE_ENV === 'production') {
      return () => {
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


