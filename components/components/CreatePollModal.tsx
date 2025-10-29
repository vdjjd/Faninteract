'use client';

import { useState } from 'react';
import Modal from './Modal';
import { createPoll, getPollsByHost } from '@/lib/actions/polls';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
  refreshPolls: () => Promise<void>;
}

export default function CreatePollModal({
  isOpen,
  onClose,
  hostId,
  refreshPolls,
}: CreatePollModalProps) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await createPoll(hostId, { title });
    await refreshPolls();
    setSaving(false);
    setTitle('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-center mb-4">📊 New Live Poll Wall</h2>

      <input
        type="text"
        placeholder="Enter private poll name..."
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
