'use client';

import dynamic from 'next/dynamic';

interface OptionsModalProps {
  type: 'fanwall';
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents?: () => Promise<void>;
}

const OptionsModalFanWall = dynamic(() => import('./OptionsModalFanWall'));

export default function OptionsModal({
  type,
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
}: OptionsModalProps) {
  if (type === 'fanwall') {
    return (
      <OptionsModalFanWall
        event={event}
        hostId={hostId}
        onClose={onClose}
        onBackgroundChange={onBackgroundChange}
        refreshEvents={refreshEvents!}
      />
    );
  }

  return null;
}
