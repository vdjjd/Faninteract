'use client';
import Modal from './Modal';
import { useState } from 'react';

export default function OptionsModalPrizeWheel({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshPrizeWheels,
}: {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (wheel: any, newValue: string) => Promise<void>;
  refreshPrizeWheels: () => Promise<void>;
}) {
  const [bgValue, setBgValue] = useState(event.background_value || '');

  async function handleSave() {
    await onBackgroundChange(event, bgValue);
    await refreshPrizeWheels();
    onClose();
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <h2 className="text-xl font-bold mb-4 text-center">
        ⚙ Customize Prize Wheel
      </h2>

      <label className="block text-sm font-semibold mb-1">Background:</label>
      <input
        type="text"
        value={bgValue}
        onChange={(e) => setBgValue(e.target.value)}
        placeholder="linear-gradient(...) or image URL"
        className="w-full p-2 mb-4 text-black rounded"
      />

      <div className="flex justify-center gap-3">
        <button
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
        >
          ✅ Save
        </button>
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
        >
          ✖ Cancel
        </button>
      </div>
    </Modal>
  );
}