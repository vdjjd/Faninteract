'use client';

import { createContext, useContext, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const RTContext = createContext(null);

export function SupabaseRealtimeProvider({ children }) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!channelRef.current) {
      // Create channel
      const ch = supabase.channel('faninteract_unified', {
        config: {
          broadcast: { self: false },
          presence: { key: `tab-${Math.random().toString(36).slice(2)}` },
        },
      });

      // Proper subscribe signature (Supabase v2)
      ch.subscribe((status) => {
        console.log('📡 Realtime status:', status);
      });

      // Store channel ref
      channelRef.current = ch;
    }

    return () => {
      // Do NOT unsubscribe automatically.
      // The router depends on a persistent realtime channel.
      // If you unsubscribe here you break countdown, fade, etc.
    };
  }, []);

  return (
    <RTContext.Provider value={channelRef}>
      {children}
    </RTContext.Provider>
  );
}

export function useRealtimeChannel() {
  return useContext(RTContext);
}
