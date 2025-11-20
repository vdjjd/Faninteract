'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface AdOverlayProps {
  showAd: boolean;
  currentAd: any;
  adTransition?: string;
}

const transitions: Record<string, any> = {
  'Fade In / Fade Out': {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.8, ease: 'easeInOut' },
  },
  'Slide Up / Slide Out': {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -100 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Slide Down / Slide Out': {
    initial: { opacity: 0, y: -100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 100 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Slide Left / Slide Right': {
    initial: { opacity: 0, x: 120 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -120 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Slide Right / Slide Left': {
    initial: { opacity: 0, x: -120 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 120 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Zoom In / Zoom Out': {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.15 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  'Zoom Out / Zoom In': {
    initial: { opacity: 0, scale: 0.7 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.7 },
    transition: { duration: 0.9, ease: 'easeInOut' },
  },
  Flip: {
    initial: { opacity: 0, rotateY: 180 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: -180 },
    transition: { duration: 1, ease: 'easeInOut' },
  },
  'Rotate In / Rotate Out': {
    initial: { opacity: 0, rotate: -90 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 90 },
    transition: { duration: 1, ease: 'easeInOut' },
  },
};

const defaultTransition = transitions['Fade In / Fade Out'];

export default function AdOverlay({ showAd, currentAd, adTransition = 'Fade In / Fade Out' }: AdOverlayProps) {

  const selected = transitions[adTransition] || defaultTransition;

  return (
    <AnimatePresence mode="wait">
      {showAd && currentAd && (
        <motion.div
          key={currentAd.id}
          {...selected}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'black',
            zIndex: 999999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {currentAd.type === 'image' ? (
            <img
              src={currentAd.url}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <video
              src={currentAd.url}
              autoPlay
              muted
              playsInline
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
