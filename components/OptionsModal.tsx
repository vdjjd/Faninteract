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

  /* --- NEW state for warning popup --- */
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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
      <div
        className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
        style={{ background: localEvent.background_value || DEFAULT_GRADIENT }}
      >
        <h3 className="text-center text-xl font-bold mb-3">⚙ Edit Wall Settings</h3>

        {/* ---- all your original form unchanged ---- */}
        {/* (Title, Layout, Colors, Gradients, Upload, Buttons) */}

        {/* ---- COLORS ---- */}
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

        {/* ---- GRADIENTS ---- */}
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

        {/* ---- UPLOAD IMAGE ---- */}
        <div className="mt-6 text-center">
          <p className="text-sm font-semibold leading-tight mb-2">
            Upload Custom Background
            <br />
            <span className="text-xs text-gray-300">
              (1920×1080 JPG, PNG, or WEBP)
            </span>
          </p>
          <div className="flex justify-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="text-sm text-center"
            />
          </div>
          {uploading && <p className="text-yellow-400 text-xs mt-2 animate-pulse">Uploading...</p>}
        </div>

        {/* ---- BUTTONS ---- */}
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

      {/* ---- CUSTOM WARNING POPUP ---- */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999] backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-[#0a2540] via-[#102a46] to-[#1b2b44] border border-red-500/60 rounded-2xl shadow-[0_0_20px_rgba(255,0,0,0.3)] p-6 w-[400px] text-center text-white">
            <h3 className="text-lg font-bold mb-2">⚠️ Background Change Warning</h3>
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              Changing to a color or gradient will <span className="text-red-400 font-semibold">delete</span> your uploaded image.
              <br />You’ll need to re-upload it later if you want to use it again.
            </p>
            <div className="flex justify-center gap-4">
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
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
              >
                ✅ Continue
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  setPendingChange(null);
                }}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
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
