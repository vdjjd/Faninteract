'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { supabase } from '@/lib/supabaseClient';

interface BroadcastMessage {
  event: string;
  payload: any;
}

const RTContext = createContext<{
  realtimeReady: boolean;
  broadcast: (event: string, payload: any) => void;
} | null>(null);

export function SupabaseRealtimeProvider({ children }) {
  const unifiedRef = useRef(null);
  const busRef = useRef<BroadcastChannel | null>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);

  // 🚌 Create shared cross-tab bus
  if (!busRef.current) {
    busRef.current = new BroadcastChannel("faninteract_realtime_bus");
  }

  useEffect(() => {
    console.log("🟢 Initializing unified realtime channel...");

    const unified = supabase.channel("faninteract_unified_shared", {
      config: {
        broadcast: { self: false },
        presence: { key: `client-${crypto.randomUUID()}` }
      }
    });

    unified.on("broadcast", (msg) => {
      console.log("📥 SUPABASE → BUS", msg);
      busRef.current?.postMessage({
        type: "broadcast",
        msg
      });
    });

    unified.subscribe((status) => {
      console.log("📡 Unified status:", status);
      if (status === "SUBSCRIBED") {
        unifiedRef.current = unified;
        setRealtimeReady(true);
      }
    });

    return () => {
      unified.unsubscribe();
    };
  }, []);

  // 🟦 Safe broadcast function
  function broadcast(event: string, payload: any) {
    const safePayload = {
      ...payload,
      id: payload?.id ? String(payload.id).trim() : null
    };

    // 1. Send to supabase
    unifiedRef.current?.send({
      type: "broadcast",
      event,
      payload: safePayload
    });

    // 2. Mirror to all tabs instantly
    busRef.current?.postMessage({
      type: "broadcast",
      msg: { event, payload: safePayload }
    });
  }

  return (
    <RTContext.Provider value={{ realtimeReady, broadcast }}>
      {children}
    </RTContext.Provider>
  );
}

export function useRealtimeChannel() {
  return useContext(RTContext);
}
