'use client';

import Modal from './Modal';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  const [publicTitle, setPublicTitle] = useState(event.title || '');
  const [privateTitle, setPrivateTitle] = useState(event.host_title || '');
  const [visibility, setVisibility] = useState(event.visibility || 'public');
  const [passphrase, setPassphrase] = useState(event.passphrase || '');
  const [spinSpeed, setSpinSpeed] = useState(event.spin_speed || 'Medium');
  const [uploading, setUploading] = useState(false);

  /* ---------- Upload Background ---------- */
  async function handleBackgroundUpload(file: File) {
    try {
      setUploading(true);
      const filePath = `${event.id}/background-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(filePath);

      const newUrl = publicUrlData.publicUrl;
      setBgValue(newUrl);
      await onBackgroundChange(event, newUrl);
      await refreshPrizeWheels();
    } catch (err) {
      console.error('❌ Background upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  /* ---------- Save Changes ---------- */
  async function handleSave() {
    try {
      await supabase
        .from('prize_wheels')
        .update({
          title: publicTitle,
          host_title: privateTitle,
          visibility,
          passphrase: visibility === 'private' ? passphrase : null,
          spin_speed: spinSpeed,
          background_value: bgValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      await refreshPrizeWheels();
      onClose();
    } catch (err) {
      console.error('❌ Error saving prize wheel options:', err);
    }
  }

  /* ---------- Render ---------- */
  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="text-white space-y-4">
        <h2 className="text-2xl font-bold text-center mb-4">
          ⚙ Prize Wheel Options
        </h2>

        {/* PUBLIC TITLE */}
        <div>
          <label className="block text-sm font-semibold mb-1">Public Title</label>
          <input
            type="text"
            value={publicTitle}
            onChange={(e) => setPublicTitle(e.target.value)}
            placeholder="Shown on wheel"
            className="w-full p-2 text-black rounded"
          />
        </div>

        {/* PRIVATE TITLE */}
        <div>
          <label className="block text-sm font-semibold mb-1">Private Title</label>
          <input
            type="text"
            value={privateTitle}
            onChange={(e) => setPrivateTitle(e.target.value)}
            placeholder="Shown on dashboard"
            className="w-full p-2 text-black rounded"
          />
        </div>

        {/* VISIBILITY */}
        <div>
          <label className="block text-sm font-semibold mb-1">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full p-2 text-black rounded"
          >
            <option value="public">Public</option>
            <option value="private">Private (requires passphrase)</option>
          </select>
        </div>

        {visibility === 'private' && (
          <div>
            <label className="block text-sm font-semibold mb-1">Passphrase</label>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              className="w-full p-2 text-black rounded"
            />
          </div>
        )}

        {/* SPIN SPEED */}
        <div>
          <label className="block text-sm font-semibold mb-1">Spin Speed</label>
          <select
            value={spinSpeed}
            onChange={(e) => setSpinSpeed(e.target.value)}
            className="w-full p-2 text-black rounded"
          >
            <option value="Quick">Quick (5s spin + 5s slowdown)</option>
            <option value="Medium">Medium (10s spin + 5s slowdown)</option>
            <option value="Long">Long (15s spin + 5s slowdown)</option>
          </select>
        </div>

        {/* BACKGROUND */}
        <div>
          <label className="block text-sm font-semibold mb-1">Background</label>
          <input
            type="text"
            value={bgValue}
            onChange={(e) => setBgValue(e.target.value)}
            placeholder="linear-gradient(...) or image URL"
            className="w-full p-2 text-black rounded mb-2"
          />
          <label className="block text-xs mb-1">Upload background image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && handleBackgroundUpload(e.target.files[0])}
            className="w-full text-sm text-gray-300"
            disabled={uploading}
          />
        </div>

        {/* BUTTONS */}
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={uploading}
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
      </div>
    </Modal>
  );
}
