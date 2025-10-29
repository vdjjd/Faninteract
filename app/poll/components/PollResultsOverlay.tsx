'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PollResultsOverlayProps {
  show: boolean;
  winner: { text: string; votes: number } | null;
}

export default function PollResultsOverlay({ show, winner }: PollResultsOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-black flex items-center justify-center text-center text-white z-50"
        >
          <div className="p-8 rounded-xl">
            <h2 className="text-4xl font-bold mb-3 font-[Bebas_Neue] tracking-wide">
              Poll Closed
            </h2>
            {winner && (
              <>
                <p className="text-2xl font-semibold text-yellow-400 drop-shadow-lg">
                  {winner.text}
                </p>
                <p className="text-xl mt-2 text-gray-200">
                  🗳 {winner.votes} votes
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}