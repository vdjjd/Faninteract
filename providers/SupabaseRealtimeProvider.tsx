'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SupabaseRealtimeContext = createContext<any>(null);
let globalChannel: any = null;

export function SupabaseRealtimeProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (channelRef.current) return;

    const presenceKey =
      typeof window !== 'undefined'
        ? `client-${window.location.host}-${Math.random().toString(36).slice(2)}`
        : 'server-client';

    if (!globalChannel) {
      globalChannel = supabase.channel('faninteract-realtime', {
        config: {
          broadcast: { self: false },
          presence: {
            key: presenceKey,   // ✅ UNIQUE PER TAB / HOST
          },
        },
      });

      globalChannel.subscribe((status: string) =>
        console.log('🔔 Realtime:', status, 'key:', presenceKey)
      );
    }

    channelRef.current = globalChannel;

    return () => {
      if (process.env.NODE_ENV === 'production') {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
      }
    };
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