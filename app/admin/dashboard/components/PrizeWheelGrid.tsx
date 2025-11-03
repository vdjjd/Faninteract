'use client';

import { cn } from '../../../../lib/utils';
import {
  getPrizeWheelsByHost,
  clearPrizeWheel,
  deletePrizeWheel,
  togglePrizeWheelStatus,
} from '@/lib/actions/prizewheels';

interface PrizeWheelGridProps {
  wheels: any[];
  host: any;
  refreshPrizeWheels: () => Promise<void>;
  onOpenOptions: (wheel: any) => void;
}

export default function PrizeWheelGrid({
  wheels,
  host,
  refreshPrizeWheels,
  onOpenOptions,
}: PrizeWheelGridProps) {
  /* ---------- OPEN WHEEL VIEW ---------- */
  async function handleLaunch(id: string) {
    const url = `${window.location.origin}/prizewheel/${id}`;
    const popup = window.open(
      url,
      '_blank',
      'width=1280,height=800,left=100,top=100,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  /* ---------- PLAY (activate wheel) ---------- */
  async function handlePlay(id: string) {
    await togglePrizeWheelStatus(id, 'live'); // ✅ fixed type
    await refreshPrizeWheels();
  }

  /* ---------- STOP (deactivate wheel) ---------- */
  async function handleStop(id: string) {
    await togglePrizeWheelStatus(id, 'inactive'); // ✅ fixed type
    await refreshPrizeWheels();
  }

  /* ---------- SPIN (placeholder until implemented) ---------- */
  async function handleSpin(id: string) {
    console.log(`🎡 Spin clicked for wheel ${id} — feature coming soon`);
    alert('Spin feature coming soon!');
  }

  /* ---------- CLEAR ---------- */
  async function handleClear(id: string) {
    await clearPrizeWheel(id);
    await refreshPrizeWheels();
  }

  /* ---------- DELETE ---------- */
  async function handleDelete(id: string) {
    await deletePrizeWheel(id);
    await refreshPrizeWheels();
  }

  /* ---------- RENDER ---------- */
  return (
    <div className={cn('mt-10', 'w-full', 'max-w-6xl')}>
      <h2 className={cn('text-xl', 'font-semibold', 'mb-3')}>🎡 Prize Wheels</h2>

      <div
        className={cn(
          'grid',
          'grid-cols-1',
          'sm:grid-cols-2',
          'md:grid-cols-3',
          'lg:grid-cols-4',
          'gap-5'
        )}
      >
        {wheels.length === 0 && (
          <p className={cn('text-gray-400', 'italic')}>
            No Prize Wheels created yet.
          </p>
        )}

        {wheels.map((wheel) => (
          <div
            key={wheel.id}
            className={cn(
              'rounded-xl',
              'p-4',
              'text-center',
              'shadow-lg',
              'bg-cover',
              'bg-center',
              'flex',
              'flex-col',
              'justify-between'
            )}
            style={{
              background:
                wheel.background_type === 'image'
                  ? `url(${wheel.background_value}) center/cover no-repeat`
                  : wheel.background_value ||
                    'linear-gradient(135deg,#0d47a1,#1976d2)',
            }}
          >
            {/* ---------- Wheel Titles ---------- */}
            <div>
              <h3
                className={cn(
                  'font-bold',
                  'text-lg',
                  'text-center',
                  'drop-shadow-md',
                  'mb-1'
                )}
              >
                {wheel.host_title || wheel.title || 'Untitled Prize Wheel'}
              </h3>
              <p className={cn('text-sm', 'mb-2')}>
                <strong>Status:</strong>{' '}
                <span
                  className={
                    wheel.status === 'live'
                      ? 'text-lime-400'
                      : wheel.status === 'inactive'
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }
                >
                  {wheel.status}
                </span>
              </p>

              {/* 🌀 Spin Speed Display */}
              <p className={cn('text-xs', 'text-gray-200', 'italic')}>
                Spin Speed: {wheel.spin_speed || 'Medium'}
              </p>
            </div>

            {/* ---------- Control Buttons ---------- */}
            <div
              className={cn(
                'flex',
                'flex-wrap',
                'justify-center',
                'gap-2',
                'mt-auto',
                'pt-2',
                'border-t',
                'border-white/10'
              )}
            >
              <button
                onClick={() => handleLaunch(wheel.id)}
                className={cn(
                  'bg-blue-600',
                  'hover:bg-blue-700',
                  'px-2',
                  'py-1',
                  'rounded',
                  'text-sm',
                  'font-semibold'
                )}
              >
                🚀 Launch
              </button>
              <button
                onClick={() => handlePlay(wheel.id)}
                className={cn(
                  'bg-green-600',
                  'hover:bg-green-700',
                  'px-2',
                  'py-1',
                  'rounded',
                  'text-sm',
                  'font-semibold'
                )}
              >
                ▶️ Play
              </button>
              <button
                onClick={() => handleSpin(wheel.id)}
                className={cn(
                  'bg-yellow-500',
                  'hover:bg-yellow-600',
                  'px-2',
                  'py-1',
                  'rounded',
                  'text-sm',
                  'font-semibold'
                )}
              >
                🎡 Spin
              </button>
              <button
                onClick={() => handleStop(wheel.id)}
                className={cn(
                  'bg-red-600',
                  'hover:bg-red-700',
                  'px-2',
                  'py-1',
                  'rounded',
                  'text-sm',
                  'font-semibold'
                )}
              >
                ⏹ Stop
              </button>
              <button
                onClick={() => handleClear(wheel.id)}
                className={cn(
                  'bg-cyan-500',
                  'hover:bg-cyan-600',
                  'px-2',
                  'py-1',
                  'rounded',
                  'text-sm',
                  'font-semibold'
                )}
              >
                🧹 Clear
              </button>
              <button
                onClick={() => onOpenOptions(wheel)}
                className={cn(
                  'bg-indigo-500',
                  'hover:bg-indigo-600',
                  'px-2',
                  'py-1',
                  'rounded',
                  'text-sm',
                  'font-semibold'
                )}
              >
                ⚙ Options
              </button>
              <button
                onClick={() => handleDelete(wheel.id)}
                className={cn(
                  'bg-red-800',
                  'hover:bg-red-900',
                  'px-2',
                  'py-1',
                  'rounded',
                  'text-sm',
                  'font-semibold'
                )}
              >
                ❌ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
