'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

interface OptionsModalProps {
  event: any; // could be an event or poll
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
  const isPoll = localEvent?.type === 'poll';

  // 🆕 warning modal state
  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);

  /* ---------- SAVE CHANGES ---------- */
  async function handleSave() {
    setSaving(true);

    const table = isPoll ? 'polls' : 'events';
    const updates: any = {
      host_title: localEvent.host_title || '',
      title: localEvent.title || '',
      updated_at: new Date().toISOString(),
    };

    if (!isPoll) {
      const countdownValue =
        localEvent.countdown && localEvent.countdown !== 'none'
          ? String(localEvent.countdown)
          : null;

      Object.assign(updates, {
        countdown: countdownValue,
        countdown_active: false,
        layout_type: localEvent.layout_type || 'Single Highlight Post',
        post_transition: localEvent.post_transition || '',
        transition_speed: localEvent.transition_speed || 'Medium',
        auto_delete_minutes: localEvent.auto_delete_minutes ?? 0,
      });
    } else {
      Object.assign(updates, {
        duration: localEvent.duration || null,
      });
    }

    const { error } = await supabase.from(table).update(updates).eq('id', localEvent.id);
    if (error) console.error('❌ Supabase update error:', error);
    else console.log('✅ Settings saved successfully');

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
        .from(isPoll ? 'polls' : 'events')
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
    <>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
        <div
          className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
          style={{
            background: localEvent.background_value || DEFAULT_GRADIENT,
          }}
        >
          <h3 className="text-center text-xl font-bold mb-3">
            ⚙ {isPoll ? 'Edit Poll Settings' : 'Edit Wall Settings'}
          </h3>

          {/* ---- SHARED FIELDS ---- */}
          <label className="block mt-2 text-sm">{isPoll ? 'Poll Title:' : 'Wall Title:'}</label>
          <input
            type="text"
            value={localEvent.host_title || ''}
            onChange={(e) => setLocalEvent({ ...localEvent, host_title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          <label className="block mt-3 text-sm">{isPoll ? 'Public Question:' : 'Public Title:'}</label>
          <input
            type="text"
            value={localEvent.title || ''}
            onChange={(e) => setLocalEvent({ ...localEvent, title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          {/* ---- POLL-SPECIFIC ---- */}
          {isPoll && (
            <>
              <label className="block mt-3 text-sm">Poll Duration:</label>
              <select
                className="w-full p-2 rounded-md text-black mt-1"
                value={localEvent.duration || 'none'}
                onChange={(e) =>
                  setLocalEvent({
                    ...localEvent,
                    duration: e.target.value === 'none' ? null : e.target.value,
                  })
                }
              >
                <option value="none">No Timer (Manual Stop)</option>
                <option value="30 Seconds">30 Seconds</option>
                <option value="1 Minute">1 Minute</option>
                <option value="2 Minutes">2 Minutes</option>
                <option value="3 Minutes">3 Minutes</option>
                <option value="5 Minutes">5 Minutes</option>
              </select>
            </>
          )}

          {/* ---- FAN WALL ONLY ---- */}
          {!isPoll && (
            <>
              {/* Countdown */}
              <label className="block mt-3 text-sm">Countdown:</label>
              <select
                className="w-full p-2 rounded-md text-black mt-1"
                value={localEvent.countdown || 'none'}
                onChange={(e) =>
                  setLocalEvent({
                    ...localEvent,
                    countdown: e.target.value === 'none' ? null : e.target.value,
                  })
                }
              >
                <option value="none">No Countdown / Start Immediately</option>
                {[
                  '30 Seconds','1 Minute','2 Minutes','3 Minutes','4 Minutes','5 Minutes',
                  '10 Minutes','15 Minutes','20 Minutes','25 Minutes','30 Minutes','45 Minutes','60 Minutes',
                ].map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>

              {/* Layout */}
              <label className="block mt-3 text-sm">Layout Type:</label>
              <select
                className="w-full p-2 rounded-md text-black mt-1"
                value={localEvent.layout_type || 'Single Highlight Post'}
                onChange={(e) => setLocalEvent({ ...localEvent, layout_type: e.target.value })}
              >
                <option>Single Highlight Post</option>
                <option>2 Column × 2 Row</option>
                <option>4 Column × 2 Row</option>
              </select>
            </>
          )}

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
            ].map((g) => (
              <div
                key={g}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: g }}
                onClick={() => handleBackgroundChange('gradient', g)}
              />
            ))}
          </div>

          {/* ---- UPLOAD ---- */}
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold mb-2">Upload Custom Background</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="text-sm text-center"
            />
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
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
            >
              ✖ Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
