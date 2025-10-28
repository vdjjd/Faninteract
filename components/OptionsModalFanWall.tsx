'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

interface OptionsModalFanWallProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export default function OptionsModalFanWall({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
}: OptionsModalFanWallProps) {
  const [localEvent, setLocalEvent] = useState({ ...event });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);

  /* ---------- Update Background ---------- */
  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    if (localEvent.background_type === 'image') {
      setPendingChange({ type, value });
      setShowWarning(true);
      return;
    }

    await supabase
      .from('events')
      .update({
        background_type: type,
        background_value: value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localEvent.id);

    setLocalEvent({ ...localEvent, background_type: type, background_value: value });
    await refreshEvents();
    await onBackgroundChange(localEvent, value);
  }

  /* ---------- Upload Background ---------- */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressed = await imageCompression(file, { maxWidthOrHeight: 1920, useWebWorker: true });
      const ext = file.type.split('/')[1];
      const filePath = `${localEvent.id}/fanwall-bg-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('wall-backgrounds').getPublicUrl(filePath);
      await supabase
        .from('events')
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localEvent.id);

      setLocalEvent({
        ...localEvent,
        background_type: 'image',
        background_value: publicUrl.publicUrl,
      });
      await refreshEvents();
      await onBackgroundChange(localEvent, publicUrl.publicUrl);
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  /* ---------- Confirm Image Delete ---------- */
  async function confirmChange() {
    if (!pendingChange) return;
    await supabase
      .from('events')
      .update({
        background_type: pendingChange.type,
        background_value: pendingChange.value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localEvent.id);

    setLocalEvent({
      ...localEvent,
      background_type: pendingChange.type,
      background_value: pendingChange.value,
    });

    setShowWarning(false);
    setPendingChange(null);
    await refreshEvents();
    await onBackgroundChange(localEvent, pendingChange.value);
  }

  function cancelChange() {
    setShowWarning(false);
    setPendingChange(null);
  }

  /* ---------- Save Layout + Transition + Speed ---------- */
  async function handleSave() {
    try {
      setSaving(true);
      const { transition_style, transition_speed, layout_style } = localEvent;

      const { error } = await supabase
        .from('events')
        .update({
          transition_style,
          transition_speed,
          layout_style,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localEvent.id);

      if (error) console.error('❌ Save error:', error);
      await refreshEvents();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* ⚠️ Warning Overlay */}
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

      {/* 🔧 Main Modal */}
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
        <div
          className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
          style={{ background: localEvent.background_value || DEFAULT_GRADIENT }}
        >
          <h3 className="text-center text-xl font-bold mb-3">⚙ Edit Fan Zone Wall</h3>

          {/* ---- Layout Style ---- */}
          <label className="block mt-2 text-sm font-semibold">🧩 Layout Style:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localEvent.layout_style || 'Grid4x2'}
            onChange={(e) => setLocalEvent({ ...localEvent, layout_style: e.target.value })}
          >
            <option value="Grid2x2">2×2 Grid</option>
            <option value="Grid4x2">4×2 Grid</option>
            <option value="SingleHeight">Single Height</option>
          </select>

          {/* ---- Transition Style ---- */}
          <label className="block mt-4 text-sm font-semibold">🎞 Transition Style:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localEvent.transition_style || 'Fade In / Fade Out'}
            onChange={(e) => setLocalEvent({ ...localEvent, transition_style: e.target.value })}
          >
            <option value="Fade In / Fade Out">Fade In / Fade Out</option>
            <option value="Slide Up / Slide Out">Slide Up / Slide Out</option>
            <option value="Slide Down / Slide Out">Slide Down / Slide Out</option>
          </select>

          {/* ---- Transition Speed ---- */}
          <label className="block mt-4 text-sm font-semibold">⏱ Transition Speed:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localEvent.transition_speed || 'Medium'}
            onChange={(e) => setLocalEvent({ ...localEvent, transition_speed: e.target.value })}
          >
            <option value="Slow">Slow</option>
            <option value="Medium">Medium</option>
            <option value="Fast">Fast</option>
          </select>

          {/* ---- Solid Colors ---- */}
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

          {/* ---- Gradients ---- */}
          <h4 className="mt-4 text-sm font-semibold">🌈 Gradients</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              'linear-gradient(135deg,#002244,#69BE28)',
              'linear-gradient(135deg,#203731,#FFB612)',
              'linear-gradient(135deg,#03202F,#FB4F14)',
              'linear-gradient(135deg,#0B2265,#A71930)',
              'linear-gradient(135deg,#A71930,#FFB612)',
              'linear-gradient(135deg,#004C54,#A5ACAF)',
              'linear-gradient(135deg,#002C5F,#FFC20E)',
              'linear-gradient(135deg,#4F2683,#FFC62F)',
            ].map((g) => (
              <div
                key={g}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: g }}
                onClick={() => handleBackgroundChange('gradient', g)}
              />
            ))}
          </div>

          {/* ---- Upload Image ---- */}
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
