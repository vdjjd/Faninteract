'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { createPrizeWheel } from '@/lib/actions/prizewheels';
import { cn } from "../lib/utils";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      // ✅ Only send title. Server handles ALL defaults.
      const created = await createPrizeWheel(hostId, { title });

      if (!created) {
        setErrorMsg("Failed to create prize wheel. Check console.");
        setSaving(false);
        return;
      }

      console.log("✅ Prize wheel created:", created);

      await refreshPrizeWheels();

      // Reset fields
      setTitle('');
      onClose();
    } catch (err) {
      console.error("❌ Prize wheel create error:", err);
      setErrorMsg("Something went wrong creating the wheel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className={cn('text-xl', 'font-bold', 'text-center', 'mb-4')}>
        🎡 New Prize Wheel
      </h2>

      <input
        type="text"
        placeholder="Prize Wheel Name…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={cn(
          'w-full',
          'px-3',
          'py-2',
          'rounded-lg',
          'text-black',
          'text-sm',
          'mb-2'
        )}
      />

      {errorMsg && (
        <p className={cn('text-red-400', 'text-sm', 'mb-2', 'text-center')}>
          {errorMsg}
        </p>
      )}

      <div className={cn('flex', 'justify-center', 'gap-3', 'mt-3')}>
        <button
          onClick={handleCreate}
          disabled={saving}
          className={cn(
            'bg-green-600',
            'hover:bg-green-700',
            'px-4',
            'py-2',
            'rounded-lg',
            'font-semibold'
          )}
        >
          {saving ? 'Creating…' : '✅ Create'}
        </button>

        <button
          onClick={onClose}
          className={cn(
            'bg-red-600',
            'hover:bg-red-700',
            'px-4',
            'py-2',
            'rounded-lg',
            'font-semibold'
          )}
        >
          ✖ Cancel
        </button>
      </div>
    </Modal>
  );
}
