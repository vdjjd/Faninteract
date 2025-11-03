'use client';

import dynamic from 'next/dynamic';

/* -------------------------------------------------------------------------- */
/*                               TYPE INTERFACES                              */
/* -------------------------------------------------------------------------- */
type ModalType = 'fanwall' | 'poll' | 'prizewheel';

interface BaseModalProps {
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (item: any, newValue: string) => Promise<void>;
}

/* ---------- Fan Wall ---------- */
interface FanWallProps extends BaseModalProps {
  wall: any;
  refreshFanWalls: () => Promise<void>;
}

/* ---------- Poll ---------- */
interface PollProps extends BaseModalProps {
  event: any;
  refreshPolls: () => Promise<void>;
}

/* ---------- Prize Wheel ---------- */
interface PrizeWheelProps extends BaseModalProps {
  event: any;
  refreshPrizeWheels: () => Promise<void>;
}

/* ---------- Props Wrapper ---------- */
interface OptionsModalProps {
  type: ModalType;
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (item: any, newValue: string) => Promise<void>;
  refreshFanWalls?: () => Promise<void>;
  refreshPolls?: () => Promise<void>;
  refreshPrizeWheels?: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                               DYNAMIC IMPORTS                              */
/* -------------------------------------------------------------------------- */
const OptionsModalFanWall = dynamic(() => import('./OptionsModalFanWall'));
const OptionsModalPoll = dynamic(() => import('./OptionsModalPoll'));
const OptionsModalPrizeWheel = dynamic(() => import('./OptionsModalPrizeWheel'));

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */
export default function OptionsModal({
  type,
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshFanWalls,
  refreshPolls,
  refreshPrizeWheels,
}: OptionsModalProps) {
  switch (type) {
    case 'fanwall':
      return (
        <OptionsModalFanWall
          wall={event}                        // ✅ use correct prop name
          hostId={hostId}
          onClose={onClose}
          onBackgroundChange={onBackgroundChange}
          refreshFanWalls={refreshFanWalls!}  // ✅ correct naming
        />
      );

    case 'poll':
      return (
        <OptionsModalPoll
          event={event}
          hostId={hostId}
          onClose={onClose}
          onBackgroundChange={onBackgroundChange}
          refreshPolls={refreshPolls!}
        />
      );

    case 'prizewheel':
      return (
        <OptionsModalPrizeWheel
          event={event}
          hostId={hostId}
          onClose={onClose}
          onBackgroundChange={onBackgroundChange}
          refreshPrizeWheels={refreshPrizeWheels!}
        />
      );

    default:
      return null;
  }
}
