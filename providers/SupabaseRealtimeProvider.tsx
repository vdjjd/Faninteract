'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SupabaseRealtimeContext = createContext<any>(null);
let globalChannel: any = null;

export function SupabaseRealtimeProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (channelRef.current) return;

    if (!globalChannel) {
      globalChannel = supabase.channel('faninteract-realtime', {
        config: { broadcast: { self: false }, presence: { key: 'faninteract-client' } },
      });
      globalChannel.subscribe((status: string) => console.log('🔔 Realtime:', status));
    }
    channelRef.current = globalChannel;

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

