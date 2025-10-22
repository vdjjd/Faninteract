'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';
const BAR_COLORS = [
  '#00338D', '#C60C30', '#203731', '#FFB612',
  '#0B2265', '#A71930', '#03202F', '#FB4F14',
  '#002C5F', '#FFC20E', '#004C54', '#A5ACAF'
];

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
  const isPoll = localEvent?.type === 'poll';

  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);

  /* ---------- Poll Option Colors ---------- */
  const [pollOptions, setPollOptions] = useState(
    localEvent.options || Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      text: `Option ${i + 1}`,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }))
  );

 function handleColorChange(idx: number, color: string) {
  setPollOptions((prev: { id: number; text: string; color: string }[]) =>
    prev.map((opt, i) => (i === idx ? { ...opt, color } : opt))
  );
}

function handleTextChange(idx: number, text: string) {
  setPollOptions((prev: { id: number; text: string; color: string }[]) =>
    prev.map((opt, i) => (i === idx ? { ...opt, text } : opt))
  );
}

  /* ---------- SAVE ---------- */
  async function handleSave() {
    setSaving(true);
    const table = isPoll ? 'polls' : 'events';

    const updates: any = {
      host_title: localEvent.host_title || '',
      title: localEvent.title || '',
      updated_at: new Date().toISOString(),
    };

    if (!isPoll) {
      Object.assign(updates, {
        countdown: localEvent.countdown || null,
        layout_type: localEvent.layout_type || 'Single Highlight Post',
        transition_speed: localEvent.transition_speed || 'Medium',
        post_transition: localEvent.post_transition || 'Fade In / Fade Out',
        auto_delete_minutes: localEvent.auto_delete_minutes ?? 0,
      });
    } else {
      Object.assign(updates, {
        duration: localEvent.duration || null,
        options: pollOptions,
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
        .from(table)
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          background_url: publicUrl.publicUrl,
        })
        .eq('id', localEvent.id);
      if (updateError) throw updateError;

      setLocalEvent({
        ...localEvent,
        background_type: 'image',
        background_value: publicUrl.publicUrl,
      });
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  /* ---------- HANDLE COLOR / GRADIENT ---------- */
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
          style={{ background: localEvent.background_value || DEFAULT_GRADIENT }}
        >
          <h3 className="text-center text-xl font-bold mb-3">
            ⚙ {isPoll ? 'Edit Live Poll Settings' : 'Edit Fan Zone Wall'}
          </h3>

          {/* ---- Shared Fields ---- */}
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

          {/* ---- Poll Fields ---- */}
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
                <option value="none">Manual Stop</option>
                <option>30 Seconds</option>
                <option>1 Minute</option>
                <option>2 Minutes</option>
                <option>3 Minutes</option>
                <option>5 Minutes</option>
              </select>

              {/* ---- Poll Answers ---- */}
              <h4 className="mt-5 text-sm font-semibold">🗳 Poll Answers & Colors</h4>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {pollOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleTextChange(idx, e.target.value)}
                      className="flex-1 p-1 rounded-md text-black text-sm"
                    />
                    <div className="flex gap-1">
                      {BAR_COLORS.slice(0, 6).map((c) => (
                        <div
                          key={c}
                          onClick={() => handleColorChange(idx, c)}
                          className={`w-5 h-5 rounded-full cursor-pointer border ${
                            opt.color === c ? 'border-white' : 'border-gray-400'
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ---- Fan Zone Wall Fields ---- */}
          {!isPoll && (
            <>
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
                {['30 Seconds','1 Minute','2 Minutes','3 Minutes','4 Minutes','5 Minutes','10 Minutes'].map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </>
          )}

          {/* ---- Color Selectors ---- */}
          <h4 className="mt-5 text-sm font-semibold">🎨 Background Colors</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              '#e53935','#8e24aa','#1e88e5','#43a047','#fb8c00','#fdd835','#6d4c41','#00acc1'
            ].map((c) => (
              <div
                key={c}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: c }}
                onClick={() => handleBackgroundChange('solid', c)}
              />
            ))}
          </div>

          <h4 className="mt-4 text-sm font-semibold">🌈 Gradient Presets</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              'linear-gradient(135deg,#002244,#69BE28)',
              'linear-gradient(135deg,#00338D,#C60C30)',
              'linear-gradient(135deg,#0B2265,#A71930)',
              'linear-gradient(135deg,#203731,#FFB612)',
              'linear-gradient(135deg,#4F2683,#FFC62F)',
              'linear-gradient(135deg,#241773,#9E7C0C)',
              'linear-gradient(135deg,#03202F,#FB4F14)',
              'linear-gradient(135deg,#002C5F,#FFC20E)',
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
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="text-sm text-center"
            />
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
