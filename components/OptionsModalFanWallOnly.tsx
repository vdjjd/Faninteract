'use client';

import dynamic from 'next/dynamic';

interface OptionsModalFanWallOnlyProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

const OptionsModalFanWall = dynamic(() => import('./OptionsModalFanWall'));

export default function OptionsModalFanWallOnly({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
}: OptionsModalFanWallOnlyProps) {
  return (
    <OptionsModalFanWall
      event={event}
      hostId={hostId}
      onClose={onClose}
      onBackgroundChange={onBackgroundChange}
      refreshEvents={refreshEvents}
    />
  );
}
