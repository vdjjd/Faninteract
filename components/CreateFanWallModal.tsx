'use client';

import { useState } from 'react';
import Modal from './Modal';
import { createFanWall, getFanWallsByHost } from '@/lib/actions/fan_walls';
import { cn } from "../lib/utils";

interface CreateFanWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
  refreshFanWalls: () => Promise<void>;
}

export default function CreateFanWallModal({
  isOpen,
  onClose,
  hostId,
  refreshFanWalls,
}: CreateFanWallModalProps) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await createFanWall(hostId, { title });
    await refreshFanWalls();
    setSaving(false);
    setTitle('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className={cn('text-xl', 'font-bold', 'text-center', 'mb-4')}>🎤 New Fan Zone Wall</h2>

      <input
        type="text"
        placeholder="Enter private wall name..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'text-black', 'text-sm', 'mb-4')}
      />

      <div className={cn('flex', 'justify-center', 'gap-3')}>
        <button
          onClick={handleCreate}
          disabled={saving}
          className={cn('bg-green-600', 'hover:bg-green-700', 'px-4', 'py-2', 'rounded-lg', 'font-semibold')}
        >
          {saving ? 'Creating...' : '✅ Create'}
        </button>
        <button
          onClick={onClose}
          className={cn('bg-red-600', 'hover:bg-red-700', 'px-4', 'py-2', 'rounded-lg', 'font-semibold')}
        >
          ✖ Cancel
        </button>
      </div>
    </Modal>
  );
}
