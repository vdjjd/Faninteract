'use client';

import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  onCreateFanWall: () => void;
  onCreatePoll: () => void;
  onCreatePrizeWheel: () => void;
}

export default function DashboardHeader({
  onCreateFanWall,
  onCreatePoll,
  onCreatePrizeWheel,
}: DashboardHeaderProps) {
  return (
    <div className={cn('text-center mb-6')}>
      <img
        src="/faninteractlogo.png"
        alt="FanInteract Logo"
        className={cn('w-44', 'animate-pulse', 'mb-2', 'drop-shadow-lg', 'mx-auto')}
      />
      <h1 className={cn('text-2xl', 'font-bold', 'mb-4')}>🎛 Host Dashboard</h1>

      <div className={cn('flex', 'justify-center', 'gap-4', 'flex-wrap')}>
        <button
          onClick={onCreateFanWall}
          className={cn(
            'bg-blue-500',
            'hover:bg-blue-600',
            'text-white',
            'px-4',
            'py-2',
            'rounded-lg',
            'font-semibold',
            'transition-all'
          )}
        >
          ➕ New Fan Zone Wall
        </button>

        <button
          onClick={onCreatePoll}
          className={cn(
            'bg-green-500',
            'hover:bg-green-600',
            'text-white',
            'px-4',
            'py-2',
            'rounded-lg',
            'font-semibold',
            'transition-all'
          )}
        >
          📊 New Live Poll Wall
        </button>

        <button
          onClick={onCreatePrizeWheel}
          className={cn(
            'bg-purple-600',
            'hover:bg-purple-700',
            'text-white',
            'px-4',
            'py-2',
            'rounded-lg',
            'font-semibold',
            'transition-all'
          )}
        >
          🎡 New Prize Wheel
        </button>
      </div>
    </div>
  );
}

