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
  /* -------------------------------------------------------------------------- */
  /* 🧠 STATE                                                                   */
  /* -------------------------------------------------------------------------- */
  const [bgValue, setBgValue] = useState(event.background_value || '');
  const [publicTitle, setPublicTitle] = useState(event.public_title || '');
  const [privateTitle, setPrivateTitle] = useState(event.private_title || '');
  const [visibility, setVisibility] = useState(event.visibility || 'public');
  const [passphrase, setPassphrase] = useState(event.passphrase || '');
  const [spinLength, setSpinLength] = useState(event.spin_length || 'medium');
  const [uploading, setUploading] = useState(false);

  /* -------------------------------------------------------------------------- */
  /* 📤 UPLOAD BACKGROUND                                                       */
  /* -------------------------------------------------------------------------- */
  async function handleBackgroundUpload(file: File) {
    try {
      setUploading(true);
      const filePath = `${event.id}/background-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('wall-backgrounds') // ✅ same bucket as Fan Wall
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

  /* -------------------------------------------------------------------------- */
  /* 💾 SAVE CHANGES                                                            */
  /* -------------------------------------------------------------------------- */
  async function handleSave() {
    try {
      await supabase
        .from('prizewheels')
        .update({
          public_title: publicTitle,
          private_title: privateTitle,
          visibility,
          passphrase: visibility === 'private' ? passphrase : null,
          spin_length: spinLength,
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

  /* -------------------------------------------------------------------------- */
  /* 🎨 RENDER                                                                  */
  /* -------------------------------------------------------------------------- */
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
            placeholder="Title shown on wall"
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
            placeholder="Title shown on dashboard card"
            className="w-full p-2 text-black rounded"
          />
        </div>

        {/* VISIBILITY */}
        <div>
          <label className="block text-sm font-semibold mb-1">Wall Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full p-2 text-black rounded"
          >
            <option value="public">Public</option>
            <option value="private">Private (requires passphrase)</option>
          </select>
        </div>

        {/* PASSPHRASE */}
        {visibility === 'private' && (
          <div>
            <label className="block text-sm font-semibold mb-1">Passphrase</label>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase to join"
              className="w-full p-2 text-black rounded"
            />
          </div>
        )}

        {/* SPIN LENGTH */}
        <div>
          <label className="block text-sm font-semibold mb-1">Spin Length</label>
          <select
            value={spinLength}
            onChange={(e) => setSpinLength(e.target.value)}
            className="w-full p-2 text-black rounded"
          >
            <option value="quick">Quick (5s spin + 5s slowdown)</option>
            <option value="medium">Medium (15s spin + 5s slowdown)</option>
            <option value="long">Long (20s spin + 5s slowdown)</option>
          </select>
        </div>

        {/* BACKGROUND CONTROLS */}
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
