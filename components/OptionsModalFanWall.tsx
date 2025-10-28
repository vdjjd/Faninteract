'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

interface OptionsModalPrizeWheelProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (wheel: any, newValue: string) => Promise<void>;
  refreshPrizeWheels: () => Promise<void>;
}

export default function OptionsModalPrizeWheel({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshPrizeWheels,
}: OptionsModalPrizeWheelProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localWheel, setLocalWheel] = useState<any>({ ...event });
  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);

  /* ---------- Broadcast Utility ---------- */
  async function broadcastChange() {
    try {
      await supabase.channel(`prizewheel-${localWheel.id}`).send({
        type: 'broadcast',
        event: 'UPDATE',
        payload: { id: localWheel.id, updated_at: new Date().toISOString() },
      });
    } catch (err) {
      console.warn('⚠️ Broadcast failed (safe to ignore on localhost):', err);
    }
  }

  /* ---------- Save ---------- */
  async function handleSave() {
    setSaving(true);
    const updates = {
      host_title: localWheel.host_title || '',
      title: localWheel.title || '',
      spin_length: localWheel.spin_length || 'medium',
      is_private: !!localWheel.is_private,
      passphrase: localWheel.is_private ? localWheel.passphrase || null : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('prizewheels').update(updates).eq('id', localWheel.id);
    if (error) console.error('❌ Supabase update error:', error);

    await refreshPrizeWheels();
    await broadcastChange();
    setSaving(false);
    onClose();
  }

  /* ---------- Image Upload ---------- */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Please upload a JPG, PNG, or WEBP file.');
        return;
      }

      setUploading(true);
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const ext = file.type.split('/')[1];
      const filePath = `${localWheel.id}/background-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('wall-backgrounds').getPublicUrl(filePath);
      await supabase
        .from('prizewheels')
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          background_url: publicUrl.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localWheel.id);

      setLocalWheel({
        ...localWheel,
        background_type: 'image',
        background_value: publicUrl.publicUrl,
      });

      await refreshPrizeWheels();
      await broadcastChange();
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteOldImageIfExists() {
    try {
      if (localWheel.background_type !== 'image' || !localWheel.background_value) return;
      const url = localWheel.background_value;
      const parts = url.split('/wall-backgrounds/');
      if (parts.length < 2) return;
      const filePath = parts[1];
      const { error } = await supabase.storage.from('wall-backgrounds').remove([filePath]);
      if (error) console.error('⚠️ Failed to delete old image:', error);
    } catch (err) {
      console.error('❌ Error deleting old image:', err);
    }
  }

  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    if (localWheel.background_type === 'image') {
      setPendingChange({ type, value });
      setShowWarning(true);
      return;
    }

    await supabase
      .from('prizewheels')
      .update({
        background_type: type,
        background_value: value,
        background_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localWheel.id);

    setLocalWheel({ ...localWheel, background_type: type, background_value: value });
    await refreshPrizeWheels();
    await broadcastChange();
  }

  async function confirmChange() {
    if (!pendingChange) return;
    await deleteOldImageIfExists();

    await supabase
      .from('prizewheels')
      .update({
        background_type: pendingChange.type,
        background_value: pendingChange.value,
        background_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localWheel.id);

    setLocalWheel({
      ...localWheel,
      background_type: pendingChange.type,
      background_value: pendingChange.value,
    });

    setShowWarning(false);
    setPendingChange(null);
    await refreshPrizeWheels();
    await broadcastChange();
  }

  function cancelChange() {
    setShowWarning(false);
    setPendingChange(null);
  }

  /* ---------- Render ---------- */
  return (
    <>
      {/* ⚠️ Warning Overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gray-900 border border-yellow-500 p-6 rounded-2xl shadow-2xl text-white w-[90%] max-w-sm text-center">
            <h2 className="text-lg font-bold text-yellow-400 mb-3">Warning</h2>
            <p className="text-sm mb-5">
              Changing to a color or gradient will delete your current background image.
              You’ll need to re-upload it if you want it back.
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

      {/* 🔧 Main Modal */}
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
        <div
          className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
          style={{ background: localWheel.background_value || DEFAULT_GRADIENT }}
        >
          <h3 className="text-center text-xl font-bold mb-3">⚙ Edit Prize Wheel</h3>

          {/* ---- Titles ---- */}
          <label className="block text-sm">Private Wheel Title:</label>
          <input
            type="text"
            value={localWheel.host_title || ''}
            onChange={(e) => setLocalWheel({ ...localWheel, host_title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          <label className="block mt-3 text-sm">Public Wheel Title:</label>
          <input
            type="text"
            value={localWheel.title || ''}
            onChange={(e) => setLocalWheel({ ...localWheel, title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          {/* ---- Visibility ---- */}
          <div className="mt-4">
            <label className="block text-sm mb-1 font-semibold">Visibility:</label>
            <select
              className="w-full p-2 rounded-md text-black"
              value={localWheel.is_private ? 'private' : 'public'}
              onChange={(e) =>
                setLocalWheel({
                  ...localWheel,
                  is_private: e.target.value === 'private',
                })
              }
            >
              <option value="public">Public</option>
              <option value="private">Private (Passphrase Required)</option>
            </select>

            {localWheel.is_private && (
              <div className="mt-2">
                <label className="block text-sm mb-1">Passphrase:</label>
                <input
                  type="text"
                  value={localWheel.passphrase || ''}
                  onChange={(e) =>
                    setLocalWheel({ ...localWheel, passphrase: e.target.value })
                  }
                  className="w-full p-2 rounded-md text-black"
                  placeholder="Enter passphrase"
                />
              </div>
            )}
          </div>

          {/* ---- Spin Length ---- */}
          <label className="block mt-4 text-sm font-semibold">🎡 Spin Length:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localWheel.spin_length || 'medium'}
            onChange={(e) => setLocalWheel({ ...localWheel, spin_length: e.target.value })}
          >
            <option value="quick">Quick Spin (5s + 5s slowdown)</option>
            <option value="medium">Medium Spin (10s + 5s slowdown)</option>
            <option value="long">Long Spin (15s + 5s slowdown)</option>
          </select>

          {/* ---- Backgrounds ---- */}
          <h4 className="mt-5 text-sm font-semibold">🎨 Solid Colors</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              '#e53935','#d81b60','#8e24aa','#5e35b1','#3949ab','#1e88e5','#039be5','#00acc1',
              '#00897b','#43a047','#7cb342','#c0ca33','#fdd835','#fb8c00','#f4511e','#6d4c41',
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

          {/* ---- Upload ---- */}
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold mb-2">Upload Custom Background</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} />
            {uploading && <p className="text-yellow-400 text-xs mt-2 animate-pulse">Uploading...</p>}
          </div>

          {/* ---- Buttons ---- */}
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
