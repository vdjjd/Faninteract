'use client';

import dynamic from 'next/dynamic';

/* -------------------------------------------------------------------------- */
/*                               TYPE INTERFACES                              */
/* -------------------------------------------------------------------------- */
type ModalType = 'fanwall' | 'poll' | 'prizewheel';

interface BaseModalProps {
  hostId: string;
  onClose: () => void;
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
  refreshFanWalls,
  refreshPolls,
  refreshPrizeWheels,
}: OptionsModalProps) {
  switch (type) {
    case 'fanwall':
      return (
        <OptionsModalFanWall
          wall={event}
          hostId={hostId}
          onClose={onClose}
          refreshFanWalls={refreshFanWalls!}
        />
      );

    case 'poll':
      return (
        <OptionsModalPoll
          event={event}
          hostId={hostId}
          onClose={onClose}
          refreshPolls={refreshPolls!}
        />
      );

    case 'prizewheel':
      return (
        <OptionsModalPrizeWheel
          event={event}
          hostId={hostId}
          onClose={onClose}
          refreshPrizeWheels={refreshPrizeWheels!}
        />
      );

    default:
      return null;
  }
}
