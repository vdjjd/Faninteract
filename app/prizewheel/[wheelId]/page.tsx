'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ keep your real component names
import InactiveWall from '../components/wall/InactiveWall';
import ActiveWall from '../components/wall/ActiveWall';

export default function PrizeWheelPage() {
  const { wheelId } = useParams();
  const [wheel, setWheel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('Loading...');

  async function loadWheel() {
    console.log('🧭 wheelId:', wheelId);
    if (!wheelId) {
      setDebugInfo('⚠️ No wheelId found in URL.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('prize_wheels')
      .select(`*, host:hosts (branding_logo_url)`)
      .eq('id', wheelId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading prize wheel:', error);
      setDebugInfo(`❌ Supabase Error: ${error.message}`);
    } else if (!data) {
      console.warn('🚫 No wheel found for id:', wheelId);
      setDebugInfo(`🚫 No wheel found for id: ${wheelId}`);
    } else {
      console.log('✅ Loaded wheel:', data);
      setDebugInfo(`✅ Wheel Loaded: ${JSON.stringify(data, null, 2)}`);
      setWheel(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadWheel();
  }, [wheelId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white text-center p-6">
        <p className="text-2xl">Loading Prize Wheel...</p>
        <pre className="text-sm text-gray-400 mt-4">{debugInfo}</pre>
      </div>
    );
  }

  if (!wheel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white text-center p-6">
        <p className="text-2xl">❌ Prize Wheel Not Found</p>
        <pre className="text-sm text-gray-400 mt-4">{debugInfo}</pre>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {wheel.status === 'live' ? (
        <motion.div
          key="active"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <ActiveWall event={wheel} />
        </motion.div>
      ) : (
        <motion.div
          key="inactive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <InactiveWall event={wheel} />
        </motion.div>
      )}

      {/* Debug Overlay */}
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          left: 10,
          background: 'rgba(0,0,0,0.6)',
          color: '#0f0',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          maxWidth: '90vw',
          zIndex: 9999,
          whiteSpace: 'pre-wrap',
        }}
      >
        {debugInfo}
      </div>
    </AnimatePresence>
  );
}
