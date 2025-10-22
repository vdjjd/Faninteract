'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

interface OptionsModalProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export default function OptionsModal({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
}: OptionsModalProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localEvent, setLocalEvent] = useState<any>({ ...event });

  /* ---------- NEW: custom warning modal ---------- */
  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);

  /* ---------- SAVE CHANGES ---------- */
  async function handleSave() {
    setSaving(true);
    const countdownValue =
      localEvent.countdown && localEvent.countdown !== 'none'
        ? String(localEvent.countdown)
        : null;

    const updates = {
      host_title: localEvent.host_title || '',
      title: localEvent.title || '',
      countdown: countdownValue,
      countdown_active: false,
      layout_type: localEvent.layout_type || 'Single Highlight Post',
      post_transition: localEvent.post_transition || '',
      transition_speed: localEvent.transition_speed || 'Medium',
      auto_delete_minutes: localEvent.auto_delete_minutes ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('events').update(updates).eq('id', localEvent.id);
    if (error) console.error('❌ Supabase update error:', error);
    else console.log('✅ Event saved successfully');

    await refreshEvents();
    setSaving(false);
    onClose();
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
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const ext = file.type.split('/')[1];
      const filePath = `${localEvent.id}/background-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('wall-backgrounds').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('events')
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          background_url: publicUrl.publicUrl,
        })
        .eq('id', localEvent.id);

      if (updateError) throw updateError;

      console.log('✅ Image uploaded successfully!');
      setLocalEvent({
        ...localEvent,
        background_type: 'image',
        background_value: publicUrl.publicUrl,
      });
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed. Please check console for details.');
    } finally {
      setUploading(false);
    }
  }

  /* ---------- DELETE OLD IMAGE ---------- */
  async function deleteOldImageIfExists() {
    try {
      if (localEvent.background_type !== 'image' || !localEvent.background_value) return;
      const url = localEvent.background_value;
      const parts = url.split('/wall-backgrounds/');
      if (parts.length < 2) return;
      const filePath = parts[1];
      console.log('🗑 Deleting old image:', filePath);
      const { error } = await supabase.storage.from('wall-backgrounds').remove([filePath]);
      if (error) console.error('⚠️ Failed to delete old image:', error);
      else console.log('✅ Old image deleted from storage.');
    } catch (err) {
      console.error('❌ Error deleting old image:', err);
    }
  }

  /* ---------- HANDLE COLOR/GRADIENT CHANGE ---------- */
  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    if (localEvent.background_type === 'image') {
      setPendingChange({ type, value });
      setShowWarning(true);
      return;
    }

    localEvent.background_type = type;
    await onBackgroundChange(localEvent, value);
    await refreshEvents();
    setLocalEvent({
      ...localEvent,
      background_type: type,
      background_value: value,
    });
  }

  /* ---------- MAIN MODAL ---------- */
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md z-50">
      <div
        className="relative w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-400/50 shadow-[0_0_25px_rgba(80,200,255,0.3)] 
        bg-gradient-to-br from-[#0a2540] via-[#102a46] to-[#1b2b44] text-white p-6 animate-fadeIn"
        style={{
          background: localEvent.background_value || DEFAULT_GRADIENT,
        }}
      >
        <h3 className="text-center text-2xl font-bold mb-4 border-b border-white/20 pb-2">
          ⚙ Edit Wall Settings
        </h3>

        {/* ---- TITLE ---- */}
        <label className="block mt-2 text-sm font-semibold">Title:</label>
        <input
          type="text"
          value={localEvent.host_title || ''}
          onChange={(e) => setLocalEvent({ ...localEvent, host_title: e.target.value })}
          className="w-full p-2 rounded-md text-black mt-1"
        />

        <label className="block mt-3 text-sm font-semibold">Public Title:</label>
        <input
          type="text"
          value={localEvent.title || ''}
          onChange={(e) => setLocalEvent({ ...localEvent, title: e.target.value })}
          className="w-full p-2 rounded-md text-black mt-1"
        />

        {/* ---- LAYOUT ---- */}
        <label className="block mt-3 text-sm font-semibold">Layout Type:</label>
        <select
          className="w-full p-2 rounded-md text-black mt-1"
          value={localEvent.layout_type || 'Single Highlight Post'}
          onChange={(e) => setLocalEvent({ ...localEvent, layout_type: e.target.value })}
        >
          <option>Single Highlight Post</option>
          <option>2 Column × 2 Row</option>
          <option>4 Column × 2 Row</option>
          <option>1 Column × 2 Row</option>
        </select>

        {/* ---- BACKGROUND ---- */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <h4 className="text-center text-base font-semibold mb-2">Background Options</h4>

          <p className="text-xs text-gray-300 mb-1">🎨 Solid Colors</p>
          <div className="grid grid-cols-8 gap-2">
            {['#e53935','#8e24aa','#1e88e5','#43a047','#fdd835','#fb8c00','#f4511e','#6d4c41'].map((c) => (
              <div
                key={c}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: c }}
                onClick={() => handleBackgroundChange('solid', c)}
              />
            ))}
          </div>

          <p className="text-xs text-gray-300 mt-3 mb-1">🌈 Gradients</p>
          <div className="grid grid-cols-8 gap-2">
            {[
              'linear-gradient(135deg,#002244,#69BE28)',
              'linear-gradient(135deg,#203731,#FFB612)',
              'linear-gradient(135deg,#03202F,#FB4F14)',
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

          <div className="mt-6 text-center">
            <p className="text-sm font-semibold leading-tight mb-2">
              Upload Custom Background
              <br />
              <span className="text-xs text-gray-300">(1920×1080 JPG, PNG, or WEBP)</span>
            </p>
            <div className="flex justify-center">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="text-sm text-center"
              />
            </div>
            {uploading && (
              <p className="text-yellow-400 text-xs mt-2 animate-pulse">Uploading...</p>
            )}
          </div>
        </div>

        {/* ---- BUTTONS ---- */}
        <div className="text-center mt-6 flex justify-center gap-5">
          <button
            disabled={saving}
            onClick={handleSave}
            className={`${
              saving ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'
            } px-5 py-2 rounded-lg font-semibold transition-all`}
          >
            {saving ? 'Saving…' : '💾 Save'}
          </button>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg font-semibold transition-all"
          >
            ✖ Close
          </button>
        </div>
      </div>

      {/* ---- CUSTOM WARNING POPUP ---- */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] animate-fadeIn backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#0a2540] via-[#102a46] to-[#1b2b44] border border-red-500/50 rounded-2xl shadow-[0_0_25px_rgba(255,0,0,0.3)] p-6 w-[420px] text-center text-white">
            <h3 className="text-lg font-bold mb-2">⚠️ Background Change Warning</h3>
            <p className="text-sm mb-4 leading-relaxed text-gray-300">
              Changing to a color or gradient will{' '}
              <span className="text-red-400 font-semibold">delete</span> your uploaded image from storage.
              <br />
              You’ll need to re-upload it later if you want to use it again.
            </p>
            <div className="flex justify-center gap-4 mt-3">
              <button
                onClick={async () => {
                  if (!pendingChange) return;
                  await deleteOldImageIfExists();
                  localEvent.background_type = pendingChange.type;
                  await onBackgroundChange(localEvent, pendingChange.value);
                  await refreshEvents();
                  setLocalEvent({
                    ...localEvent,
                    background_type: pendingChange.type,
                    background_value: pendingChange.value,
                  });
                  setShowWarning(false);
                  setPendingChange(null);
                }}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition"
              >
                ✅ Continue
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  setPendingChange(null);
                }}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold transition"
              >
                ✖ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
