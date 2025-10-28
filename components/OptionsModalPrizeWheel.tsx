'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localWheel, setLocalWheel] = useState<any>({ ...event });

  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);

  /* ---------- BROADCAST UTILITY ---------- */
  async function broadcastWheelChange() {
    try {
      await supabase.channel(`prize-wheel-${localWheel.id}`).send({
        type: 'broadcast',
        event: 'UPDATE',
        payload: { id: localWheel.id, updated_at: new Date().toISOString() },
      });
    } catch (err) {
      console.warn('⚠️ Broadcast failed (safe to ignore locally):', err);
    }
  }

  /* ---------- SAVE ---------- */
  async function handleSave() {
    setSaving(true);
    try {
      const updates = {
        title: localWheel.title || '',
        host_title: localWheel.host_title || '',
        visibility: localWheel.visibility || 'public',
        passphrase: localWheel.visibility === 'private' ? localWheel.passphrase || '' : null,
        spin_speed: localWheel.spin_speed || 'Medium',
        background_type: localWheel.background_type || 'gradient',
        background_value: localWheel.background_value || DEFAULT_GRADIENT,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('prize_wheels').update(updates).eq('id', localWheel.id);
      if (error) console.error('❌ Save error:', error);

      await refreshPrizeWheels();
      await broadcastWheelChange();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  /* ---------- IMAGE UPLOAD ---------- */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Please upload a JPG, PNG, or WEBP file.');
        return;
      }

      setUploading(true);
      const compressed = await imageCompression(file, { maxWidthOrHeight: 1920, useWebWorker: true });

      const ext = file.type.split('/')[1];
      const filePath = `${localWheel.id}/background-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('wall-backgrounds').getPublicUrl(filePath);
      await supabase
        .from('prize_wheels')
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localWheel.id);

      setLocalWheel({ ...localWheel, background_type: 'image', background_value: publicUrl.publicUrl });
      await refreshPrizeWheels();
      await broadcastWheelChange();
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  /* ---------- BACKGROUND CHANGE ---------- */
  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    if (localWheel.background_type === 'image') {
      setPendingChange({ type, value });
      setShowWarning(true);
      return;
    }

    await supabase
      .from('prize_wheels')
      .update({
        background_type: type,
        background_value: value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localWheel.id);

    setLocalWheel({ ...localWheel, background_type: type, background_value: value });
    await refreshPrizeWheels();
    await broadcastWheelChange();
  }

  async function confirmChange() {
    if (!pendingChange) return;
    await supabase
      .from('prize_wheels')
      .update({
        background_type: pendingChange.type,
        background_value: pendingChange.value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localWheel.id);

    setLocalWheel({ ...localWheel, background_type: pendingChange.type, background_value: pendingChange.value });
    setShowWarning(false);
    setPendingChange(null);
    await refreshPrizeWheels();
    await broadcastWheelChange();
  }

  function cancelChange() {
    setShowWarning(false);
    setPendingChange(null);
  }

  /* ---------- UI ---------- */
  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gray-900 border border-yellow-500 p-6 rounded-2xl shadow-2xl text-white w-[90%] max-w-sm text-center">
            <h2 className="text-lg font-bold text-yellow-400 mb-3">Warning</h2>
            <p className="text-sm mb-5">
              Changing to a color or gradient will delete your current background image.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmChange}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
              >
                Continue
              </button>
              <button
                onClick={cancelChange}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- MAIN MODAL ---------- */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
        <div
          className="border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
          style={{
            background: localWheel.background_value || DEFAULT_GRADIENT,
          }}
        >
          <h3 className="text-center text-xl font-bold mb-3">⚙ Edit Prize Wheel</h3>

          {/* Titles */}
          <label className="block mt-2 text-sm">Public Title:</label>
          <input
            type="text"
            value={localWheel.title || ''}
            onChange={(e) => setLocalWheel({ ...localWheel, title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          <label className="block mt-3 text-sm">Private Title:</label>
          <input
            type="text"
            value={localWheel.host_title || ''}
            onChange={(e) => setLocalWheel({ ...localWheel, host_title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          {/* Visibility */}
          <label className="block mt-3 text-sm">Visibility:</label>
          <select
            value={localWheel.visibility || 'public'}
            onChange={(e) => setLocalWheel({ ...localWheel, visibility: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          >
            <option value="public">Public</option>
            <option value="private">Private (requires passphrase)</option>
          </select>

          {localWheel.visibility === 'private' && (
            <>
              <label className="block mt-3 text-sm">Passphrase:</label>
              <input
                type="text"
                value={localWheel.passphrase || ''}
                onChange={(e) => setLocalWheel({ ...localWheel, passphrase: e.target.value })}
                className="w-full p-2 rounded-md text-black mt-1"
              />
            </>
          )}

          {/* Spin Speed */}
          <label className="block mt-3 text-sm">Spin Speed:</label>
          <select
            value={localWheel.spin_speed || 'Medium'}
            onChange={(e) => setLocalWheel({ ...localWheel, spin_speed: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          >
            <option value="Quick">Quick</option>
            <option value="Medium">Medium</option>
            <option value="Long">Long</option>
          </select>

          {/* Background Color Options */}
          <h4 className="mt-5 text-sm font-semibold">🎨 Solid Colors</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1',
              '#00897b', '#43a047', '#7cb342', '#c0ca33', '#fdd835', '#fb8c00', '#f4511e', '#6d4c41',
            ].map((c) => (
              <div
                key={c}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: c }}
                onClick={() => handleBackgroundChange('solid', c)}
              />
            ))}
          </div>

          <h4 className="mt-4 text-sm font-semibold">🌈 Gradients</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              'linear-gradient(135deg,#002244,#69BE28)',
              'linear-gradient(135deg,#00338D,#C60C30)',
              'linear-gradient(135deg,#203731,#FFB612)',
              'linear-gradient(135deg,#0B2265,#A71930)',
              'linear-gradient(135deg,#241773,#9E7C0C)',
              'linear-gradient(135deg,#03202F,#FB4F14)',
              'linear-gradient(135deg,#002244,#B0B7BC)',
              'linear-gradient(135deg,#002C5F,#FFC20E)',
              'linear-gradient(135deg,#E31837,#C60C30)',
              'linear-gradient(135deg,#002C5F,#A5ACAF)',
              'linear-gradient(135deg,#5A1414,#D3BC8D)',
              'linear-gradient(135deg,#4F2683,#FFC62F)',
              'linear-gradient(135deg,#A71930,#FFB612)',
              'linear-gradient(135deg,#000000,#FB4F14)',
              'linear-gradient(135deg,#004C54,#A5ACAF)',
              'linear-gradient(135deg,#A5ACAF,#0B2265)',
            ].map((g) => (
              <div
                key={g}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: g }}
                onClick={() => handleBackgroundChange('gradient', g)}
              />
            ))}
          </div>

          {/* Upload */}
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold mb-2">Upload Custom Background</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} />
            {uploading && <p className="text-yellow-400 text-xs mt-2 animate-pulse">Uploading...</p>}
          </div>

          {/* Buttons */}
          <div className="text-center mt-5 flex justify-center gap-4">
            <button
              disabled={saving}
              onClick={handleSave}
              className={`${saving ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 rounded font-semibold`}
            >
              {saving ? 'Saving…' : '💾 Save'}
            </button>
            <button onClick={onClose} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold">
              ✖ Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
