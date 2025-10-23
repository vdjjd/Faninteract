'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';
const BAR_COLORS = [
  '#00338D', '#C60C30', '#203731', '#FFB612',
  '#0B2265', '#A71930', '#03202F', '#FB4F14',
];

interface OptionsModalPollProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

interface PollOption {
  id: number;
  text: string;
  color: string | null;
}

export default function OptionsModalPoll({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
}: OptionsModalPollProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localEvent, setLocalEvent] = useState<any>({ ...event });

  const [pollOptions, setPollOptions] = useState<PollOption[]>(
    event.options?.length
      ? event.options
      : Array.from({ length: 4 }, (_, i) => ({
          id: i + 1,
          text: `Option ${i + 1}`,
          color: BAR_COLORS[i],
        }))
  );
  const [optionCount, setOptionCount] = useState<number>(pollOptions.length);

  /* ---------- Track Used Colors ---------- */
  const usedColors = useMemo(
    () => pollOptions.map((o) => o.color).filter(Boolean),
    [pollOptions]
  );

  /* ---------- Text Change ---------- */
  function handleTextChange(idx: number, text: string) {
    setPollOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, text } : opt))
    );
  }

  /* ---------- Color Change ---------- */
  function handleColorChange(idx: number, color: string) {
    setPollOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, color } : opt))
    );
  }

  /* ---------- Change Answer Count ---------- */
  function handleOptionCountChange(newCount: number) {
    setOptionCount(newCount);
    setPollOptions((prev) => {
      const updated = [...prev];

      if (newCount > prev.length) {
        for (let i = prev.length; i < newCount; i++) {
          updated.push({
            id: i + 1,
            text: `Option ${i + 1}`,
            color: null,
          });
        }
      } else if (newCount < prev.length) {
        updated.splice(newCount);
      }

      return updated;
    });
  }

  /* ---------- Save ---------- */
  async function handleSave() {
    setSaving(true);
    const updates = {
      host_title: localEvent.host_title?.trim() || event.host_title || 'Untitled Poll',
      title: localEvent.title?.trim() || event.title || 'Untitled Question',
      countdown: localEvent.countdown || null,
      countdown_active: false,
      duration: localEvent.duration || null,
      options: pollOptions,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('polls').update(updates).eq('id', localEvent.id);
    if (error) {
      console.error('❌ Error saving poll:', error);
      alert('Failed to save poll settings.');
    } else {
      console.log('✅ Poll saved successfully.');
    }

    await refreshEvents();
    setSaving(false);
    onClose();
  }

  /* ---------- Upload Background ---------- */
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
      const filePath = `${localEvent.id}/poll-background-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(filePath);

      await supabase
        .from('polls')
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          background_url: publicUrl.publicUrl,
        })
        .eq('id', localEvent.id);

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

  /* ---------- Background Color Change ---------- */
  async function handleBackgroundChange(
    type: 'solid' | 'gradient',
    value: string
  ) {
    localEvent.background_type = type;
    await onBackgroundChange(localEvent, value);
    await refreshEvents();
    setLocalEvent({
      ...localEvent,
      background_type: type,
      background_value: value,
    });
  }

  /* ---------- UI ---------- */
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
      <div
        className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-[640px] text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
        style={{ background: localEvent.background_value || DEFAULT_GRADIENT }}
      >
        <h3 className="text-center text-xl font-bold mb-4">⚙ Edit Live Poll</h3>

        {/* Title */}
        <label className="block text-sm">Poll Title (Private):</label>
        <input
          type="text"
          value={localEvent.host_title || ''}
          onChange={(e) =>
            setLocalEvent({ ...localEvent, host_title: e.target.value })
          }
          className="w-full p-2 rounded-md text-black mt-1"
        />

        <label className="block text-sm mt-3">Public Question:</label>
        <input
          type="text"
          value={localEvent.title || ''}
          onChange={(e) =>
            setLocalEvent({ ...localEvent, title: e.target.value })
          }
          className="w-full p-2 rounded-md text-black mt-1"
        />

        {/* Countdown */}
        <label className="block text-sm mt-3">Countdown (Before Start):</label>
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
          {['30 Seconds', '1 Minute', '2 Minutes', '3 Minutes', '5 Minutes'].map(
            (opt) => (
              <option key={opt}>{opt}</option>
            )
          )}
        </select>

        {/* Duration */}
        <label className="block text-sm mt-3">Poll Duration:</label>
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
          <option value="none">Manual Stop (Host Controlled)</option>
          {['5 Minutes', '10 Minutes', '15 Minutes', '20 Minutes', '30 Minutes'].map(
            (opt) => (
              <option key={opt}>{opt}</option>
            )
          )}
        </select>

        {/* Number of Answers */}
        <label className="block text-sm mt-4">Number of Answer Choices:</label>
        <select
          className="w-full p-2 rounded-md text-black mt-1"
          value={optionCount}
          onChange={(e) => handleOptionCountChange(parseInt(e.target.value))}
        >
          {[2, 3, 4, 5, 6, 7, 8].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>

        {/* Poll Options */}
        <h4 className="mt-5 text-sm font-semibold">🗳 Poll Options</h4>
        <div className="flex flex-col gap-2 mt-2">
          {pollOptions.slice(0, optionCount).map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-3">
              <input
                type="text"
                value={opt.text}
                onChange={(e) => handleTextChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 p-1 rounded-md text-black text-sm"
              />
              <div className="flex gap-1">
                {BAR_COLORS.map((c) => {
                  const isUsed = usedColors.includes(c) && opt.color !== c;
                  return (
                    <div
                      key={c}
                      onClick={() => !isUsed && handleColorChange(idx, c)}
                      className={`w-5 h-5 rounded-full cursor-pointer border transition ${
                        isUsed
                          ? 'opacity-30 cursor-not-allowed border-gray-600'
                          : opt.color === c
                          ? 'border-2 border-white scale-110'
                          : 'border border-gray-400 hover:scale-110'
                      }`}
                      style={{ background: c }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Background Options */}
        <h4 className="mt-5 text-sm font-semibold">🎨 Background Colors</h4>
        <div className="grid grid-cols-8 gap-2 mt-2">
          {[
            '#e53935', '#8e24aa', '#1e88e5', '#43a047',
            '#fb8c00', '#fdd835', '#6d4c41', '#00acc1',
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

        {/* Upload Background */}
        <div className="mt-6 text-center">
          <p className="text-sm font-semibold mb-2">Upload Custom Background</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="text-sm text-center"
          />
          {uploading && (
            <p className="text-yellow-400 text-xs mt-2 animate-pulse">
              Uploading...
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="text-center mt-6 flex justify-center gap-4">
          <button
            disabled={saving}
            onClick={handleSave}
            className={`${
              saving ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'
            } px-4 py-2 rounded font-semibold`}
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
  );
}