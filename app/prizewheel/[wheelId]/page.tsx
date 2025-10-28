'use client';

import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrizeWheelData } from '@/hooks/usePrizeWheelData'; // ✅ make sure path matches your actual hook folder
import InactiveWall from '../components/wall/InactiveWall';
import ActiveWall from '../components/wall/ActiveWall';

/* -------------------------------------------------------------------------- */
/* 🎡 MAIN PAGE                                                               */
/* -------------------------------------------------------------------------- */
export default function PrizeWheelPage() {
  const { wheelId } = useParams();
  const { wheel, loading, showLive } = usePrizeWheelData(wheelId);

  /* ---------- DEBUG OUTPUT ---------- */
  if (typeof window !== 'undefined') {
    console.log('🧭 wheelId:', wheelId);
    console.log('🎯 Loaded wheel:', wheel);
    console.log('🎬 showLive:', showLive);
  }

  /* ---------- LOADING ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        Loading Prize Wheel...
      </div>
    );
  }

  /* ---------- NOT FOUND ---------- */
  if (!wheel) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">
        ❌ Prize Wheel Not Found
      </div>
    );
  }

  /* ---------- RENDER ACTIVE OR INACTIVE WALL ---------- */
  return (
    <AnimatePresence mode="wait">
      {showLive ? (
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
    </AnimatePresence>
  );
}