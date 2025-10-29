'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface ModalProps extends React.PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="relative bg-[linear-gradient(135deg,#0a2540,#1b2b44,#000000)] border border-blue-900/40 rounded-3xl p-8 w-full max-w-md shadow-lg shadow-blue-500/30"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>

            {/* --------- MODAL CONTENT --------- */}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
