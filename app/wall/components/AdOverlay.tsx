'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface AdOverlayProps {
  showAd: boolean;
  ads: any[];
  currentAdIndex: number;
  onAdEnd: () => void;
}

/**
 * 🔹 Full-screen ad takeover overlay.
 * When active, blocks interaction (like a touchscreen takeover).
 * When inactive, it becomes invisible and click-through.
 */
export default function AdOverlay({ showAd, ads, currentAdIndex, onAdEnd }: AdOverlayProps) {
  if (!showAd || !ads?.length) return null;

  const ad = ads[currentAdIndex];
  if (!ad) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9998] flex items-center justify-center transition-opacity duration-2000',
        showAd ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      style={{
        backgroundColor: 'transparent', // ✅ absolutely clear, no tint
      }}
    >
      {ad.type === 'image' ? (
        <img
          src={ad.url}
          alt="Sponsor Ad"
          className={cn('max-w-full max-h-full object-contain rounded-xl shadow-2xl')}
          style={{
            pointerEvents: 'none', // ✅ ad visuals don’t capture clicks
          }}
        />
      ) : (
        <video
          src={ad.url}
          autoPlay
          muted
          onEnded={onAdEnd}
          className={cn('max-w-full max-h-full object-contain rounded-xl shadow-2xl')}
          style={{
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
