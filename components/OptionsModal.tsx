'use client';

import dynamic from 'next/dynamic';

interface OptionsModalProps {
  type: 'fanwall' | 'poll' | 'prizewheel' | 'trivia';
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents?: () => Promise<void>;
  refreshPrizeWheels?: () => Promise<void>;
}

/* ---------- Lazy Load the Specific Modals ---------- */
const OptionsModalFanWall = dynamic(() => import('./OptionsModalFanWall'));
const OptionsModalPoll = dynamic(() => import('./OptionsModalPoll'));
const OptionsModalPrizeWheel = dynamic(() => import('./OptionsModalPrizeWheel'));
// const OptionsModalTrivia = dynamic(() => import('./OptionsModalTrivia')); // reserved for future

export default function OptionsModal({
  type,
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
  refreshPrizeWheels,
}: OptionsModalProps) {
  switch (type) {
    /* ---------- FAN WALL ---------- */
    case 'fanwall':
      return (
        <OptionsModalFanWall
          event={event}
          hostId={hostId}
          onClose={onClose}
          onBackgroundChange={onBackgroundChange}
          refreshEvents={refreshEvents!}
        />
      );

    /* ---------- POLL ---------- */
    case 'poll':
      return (
        <OptionsModalPoll
          event={event}
          hostId={hostId}
          onClose={onClose}
          onBackgroundChange={onBackgroundChange}
          refreshEvents={refreshEvents!}
        />
      );

    /* ---------- PRIZE WHEEL ---------- */
    case 'prizewheel':
      return (
        <OptionsModalPrizeWheel
          event={event}
          hostId={hostId}
          onClose={onClose}
          onBackgroundChange={onBackgroundChange}
          refreshPrizeWheels={refreshPrizeWheels!} // ✅ correct prop
        />
      );

    /* ---------- TRIVIA (COMING SOON) ---------- */
    case 'trivia':
      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 text-white">
          <div className="bg-gray-800 p-10 rounded-xl shadow-2xl text-center">
            <h2 className="text-xl font-bold mb-2">Trivia Controls Coming Soon</h2>
            <button
              onClick={onClose}
              className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      );

    /* ---------- DEFAULT ---------- */
    default:
      return null;
  }
}
