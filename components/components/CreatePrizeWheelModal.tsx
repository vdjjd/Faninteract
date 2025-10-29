'use client';

import { useState } from 'react';
import Modal from './Modal';
import { createPrizeWheel, getPrizeWheelsByHost } from '@/lib/actions/prizewheels';

interface CreatePrizeWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
  refreshPrizeWheels: () => Promise<void>;
}

export default function CreatePrizeWheelModal({
  isOpen,
  onClose,
  hostId,
  refreshPrizeWheels,
}: CreatePrizeWheelModalProps) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await createPrizeWheel(hostId, { title });
    await refreshPrizeWheels();
    setSaving(false);
    setTitle('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-center mb-4">🎡 New Prize Wheel</h2>

      <input
        type="text"
        placeholder="Enter Prize Wheel name..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-black text-sm mb-4"
      />

      <div className="flex justify-center gap-3">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold"
        >
          {saving ? 'Creating...' : '✅ Create'}
        </button>
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
        >
          ✖ Cancel
        </button>
      </div>
    </Modal>
  );
}
