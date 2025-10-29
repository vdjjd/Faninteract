'use client';

import React from 'react';

interface GridCardProps {
  id: string;
  title: string;
  hostTitle?: string;
  status: string;
  backgroundType?: string;
  backgroundValue?: string;
  type: 'fanwall' | 'poll' | 'trivia';
  onLaunch?: (id: string) => void;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onClear?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function GridCard({
  id,
  title,
  hostTitle,
  status,
  backgroundType,
  backgroundValue,
  type,
  onLaunch,
  onStart,
  onStop,
  onClear,
  onDelete,
}: GridCardProps) {
  const icon =
    type === 'fanwall' ? '🎤' :
    type === 'poll' ? '📊' :
    '🧠';

  return (
    <div
      key={id}
      className="rounded-xl p-4 text-center shadow-lg bg-cover bg-center border border-white/10 hover:scale-[1.02] transition-transform"
      style={{
        background:
          backgroundType === 'image'
            ? `url(${backgroundValue}) center/cover no-repeat`
            : backgroundValue || 'linear-gradient(135deg,#0d47a1,#1976d2)',
      }}
    >
      <h3 className="font-bold text-lg drop-shadow-md">
        {icon} {hostTitle || title || 'Untitled'}
      </h3>

      <p className="text-sm mt-1">
        <strong>Status:</strong>{' '}
        <span
          className={
            status === 'live'
              ? 'text-lime-400'
              : status === 'inactive'
              ? 'text-orange-400'
              : 'text-gray-400'
          }
        >
          {status}
        </span>
      </p>

      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {onLaunch && (
          <button
            onClick={() => onLaunch(id)}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-sm font-semibold"
          >
            🚀 Launch
          </button>
        )}
        {onStart && (
          <button
            onClick={() => onStart(id)}
            className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm font-semibold"
          >
            ▶️ Start
          </button>
        )}
        {onStop && (
          <button
            onClick={() => onStop(id)}
            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-semibold"
          >
            ⏹ Stop
          </button>
        )}
        {onClear && (
          <button
            onClick={() => onClear(id)}
            className="bg-cyan-500 hover:bg-cyan-600 px-2 py-1 rounded text-sm font-semibold"
          >
            🧹 Clear
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-sm font-semibold"
          >
            ❌ Delete
          </button>
        )}
      </div>
    </div>
  );
}
