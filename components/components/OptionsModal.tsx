'use client';

import dynamic from 'next/dynamic';

/* -------------------------------------------------------------------------- */
/*                               TYPE INTERFACE                               */
/* -------------------------------------------------------------------------- */
type ModalType = 'fanwall' | 'poll' | 'prizewheel';

interface BaseModalProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
}

/* ---------- Fan Wall ---------- */
interface FanWallProps extends BaseModalProps {
  refreshEvents: () => Promise<void>;
}

/* ---------- Poll ---------- */
interface PollProps extends BaseModalProps {
  refreshPolls: () => Promise<void>;
}

/* ---------- Prize Wheel ---------- */
interface PrizeWheelProps extends BaseModalProps {
  refreshPrizeWheels: () => Promise<void>;
}

/* ---------- Props Wrapper ---------- */
interface OptionsModalProps {
  type: ModalType;
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents?: () => Promise<void>;
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
  refreshEvents,
  refreshPolls,
  refreshPrizeWheels,
}: OptionsModalProps) {
  switch (type) {
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
