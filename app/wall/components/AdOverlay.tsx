'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AdOverlayProps {
  showAd: boolean;
  ads: any[];
  currentAdIndex: number;
  onAdEnd: () => void;
}

/**
 * 🎞️ Full-screen ad takeover overlay
 * Cinematic dissolve using blur, brightness, and animated film-grain shimmer.
 */
export default function AdOverlay({ showAd, ads, currentAdIndex, onAdEnd }: AdOverlayProps) {
  if (!ads?.length) return null;
  const ad = ads[currentAdIndex];
  if (!ad) return null;

  return (
    <AnimatePresence mode="wait">
      {showAd && (
        <motion.div
          key={ad.id || currentAdIndex}
          initial={{ opacity: 0, filter: 'blur(25px) brightness(0.4)' }}
          animate={{ opacity: 1, filter: 'blur(0px) brightness(1)' }}
          exit={{ opacity: 0, filter: 'blur(25px) brightness(0.4)' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className={cn(
            'fixed inset-0 z-[9998] flex items-center justify-center pointer-events-auto overflow-hidden'
          )}
          style={{
            backgroundColor: 'transparent',
          }}
        >
          {/* ✅ Main Ad */}
          {ad.type === 'image' ? (
            <motion.img
              key={`img-${ad.url}`}
              src={ad.url}
              alt="Sponsor Ad"
              className={cn('max-w-full max-h-full object-contain rounded-xl shadow-2xl')}
              style={{
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          ) : (
            <motion.video
              key={`vid-${ad.url}`}
              src={ad.url}
              autoPlay
              muted
              onEnded={onAdEnd}
              className={cn('max-w-full max-h-full object-contain rounded-xl shadow-2xl')}
              style={{
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}

          {/* 🎬 Grain Overlay (subtle animated noise) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className={cn('absolute', 'inset-0', 'pointer-events-none')}
            style={{
              backgroundImage: `
                repeating-radial-gradient(circle at 0 0, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 100%)
              `,
              backgroundSize: '3px 3px',
              animation: 'grainShift 0.4s steps(2, end) infinite',
              zIndex: 2,
              mixBlendMode: 'overlay',
            }}
          />

          {/* 🔧 Inline keyframes for grain animation */}
          <style jsx>{`
            @keyframes grainShift {
              0% {
                transform: translate(0, 0);
              }
              25% {
                transform: translate(-10%, 5%);
              }
              50% {
                transform: translate(5%, -10%);
              }
              75% {
                transform: translate(10%, 10%);
              }
              100% {
                transform: translate(0, 0);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
