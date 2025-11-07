'use client';

import { createContext, useContext, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const RTContext = createContext(null);

export function SupabaseRealtimeProvider({ children }) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!channelRef.current) {
      const ch = supabase.channel('faninteract_unified', {
        config: {
          broadcast: { self: false },
          presence: { key: `tab-${Math.random().toString(36).slice(2)}` },
        },
      });

      ch.subscribe((status) => {
        console.log('✅ Unified Realtime:', status);
      });

      channelRef.current = ch;
    }

    return () => {};
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
