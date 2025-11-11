'use client';

import React from 'react';
import { supabase } from "@/lib/supabaseClient";
import { cn } from "../../../../lib/utils";

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

  /* ✅ Send reload command */
  async function sendReload() {
    await supabase.channel("fan_wall_control").send({
      type: "broadcast",
      event: "reload_wall",
      payload: { wall_id: id }
    });
  }

  /* ✅ Send fullscreen command */
  async function sendFullscreen() {
    await supabase.channel("fan_wall_control").send({
      type: "broadcast",
      event: "fullscreen_wall",
      payload: { wall_id: id }
    });
  }

  return (
    <div
      key={id}
      className={cn('rounded-xl', 'p-4', 'text-center', 'shadow-lg', 'bg-cover', 'bg-center', 'border', 'border-white/10', 'hover:scale-[1.02]', 'transition-transform')}
      style={{
        background:
          backgroundType === 'image'
            ? `url(${backgroundValue}) center/cover no-repeat`
            : backgroundValue || 'linear-gradient(135deg,#0d47a1,#1976d2)',
      }}
    >
      <h3 className={cn('font-bold', 'text-lg', 'drop-shadow-md')}>
        {icon} {hostTitle || title || 'Untitled'}
      </h3>

      <p className={cn('text-sm', 'mt-1')}>
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

      <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mt-3')}>
        {onLaunch && (
          <button
            onClick={() => onLaunch(id)}
            className={cn('bg-blue-600', 'hover:bg-blue-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
          >
            🚀 Launch
          </button>
        )}
        {onStart && (
          <button
            onClick={() => onStart(id)}
            className={cn('bg-green-600', 'hover:bg-green-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
          >
            ▶️ Start
          </button>
        )}
        {onStop && (
          <button
            onClick={() => onStop(id)}
            className={cn('bg-red-600', 'hover:bg-red-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
          >
            ⏹ Stop
          </button>
        )}
        {onClear && (
          <button
            onClick={() => onClear(id)}
            className={cn('bg-cyan-500', 'hover:bg-cyan-600', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
          >
            🧹 Clear
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className={cn('bg-red-700', 'hover:bg-red-800', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
          >
            ❌ Delete
          </button>
        )}

        {/* ✅ NEW: Reload Wall Button */}
        <button
          onClick={sendReload}
          className={cn('bg-yellow-500', 'hover:bg-yellow-600', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
        >
          🔄 Reload
        </button>

        {/* ✅ NEW: Fullscreen Button */}
        <button
          onClick={sendFullscreen}
          className={cn('bg-purple-600', 'hover:bg-purple-700', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-semibold')}
        >
          ⛶ Fullscreen
        </button>
      </div>
    </div>
  );
}
