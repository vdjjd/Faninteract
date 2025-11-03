'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { cn } from "../lib/utils";

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';
const BAR_COLORS = [
  '#00338D', '#C60C30', '#203731', '#FFB612',
  '#0B2265', '#A71930', '#03202F', '#FB4F14',
];

interface OptionsModalPollProps {
  event: any;
  hostId: string;
  onClose: () => void;
  refreshPolls: () => Promise<void>;
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
  refreshPolls,
}: OptionsModalPollProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localEvent, setLocalEvent] = useState<any>({
    ...event,
    layout: event.layout || 'horizontal',
  });

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

  const usedColors = useMemo(
    () => pollOptions.map((o) => o.color).filter(Boolean),
    [pollOptions]
  );

  function handleTextChange(idx: number, text: string) {
    setPollOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, text } : opt))
    );
  }

  function handleColorChange(idx: number, color: string) {
    setPollOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, color } : opt))
    );
  }

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

  /* ---------- Save Poll ---------- */
  async function handleSave() {
    try {
      setSaving(true);

      const updates = {
        host_title:
          localEvent.host_title?.trim() || event.host_title || 'Untitled Poll',
        title:
          localEvent.title?.trim() || event.title || 'Untitled Question',
        countdown: localEvent.countdown || null,
        countdown_active: false,
        duration:
          typeof localEvent.duration === 'string'
            ? parseInt(localEvent.duration)
            : localEvent.duration || 0,
        layout: localEvent.layout || 'horizontal',
        options: pollOptions,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('polls')
        .update(updates)
        .eq('id', localEvent.id)
        .select();

      if (error) throw error;

      console.log('✅ Poll saved successfully:', data);
      await refreshPolls();
      onClose();
    } catch (err) {
      console.error('❌ Error saving poll:', err);
      alert('Failed to save poll settings. Check console for details.');
    } finally {
      setSaving(false);
    }
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
      const filePath = `host_${hostId}/poll_${localEvent.id}/background-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('polls')
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          background_url: publicUrl.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localEvent.id);

      if (updateError) throw updateError;

      setLocalEvent({
        ...localEvent,
        background_type: 'image',
        background_value: publicUrl.publicUrl,
      });

      await refreshPolls();
      console.log('✅ Background uploaded successfully.');
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed. Check console for details.');
    } finally {
      setUploading(false);
    }
  }

  /* ---------- Background Change (for gradient/solid) ---------- */
  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    try {
      await supabase
        .from('polls')
        .update({
          background_type: type,
          background_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localEvent.id);

      setLocalEvent({
        ...localEvent,
        background_type: type,
        background_value: value,
      });

      await refreshPolls();
    } catch (err) {
      console.error('❌ Error updating background:', err);
    }
  }

  return (
    <div className={cn('fixed', 'inset-0', 'bg-black/80', 'flex', 'items-center', 'justify-center', 'z-50', 'backdrop-blur-md')}>
      <div
        className={cn('bg-gradient-to-br', 'from-[#0a2540]', 'to-[#1b2b44]', 'border', 'border-blue-400', 'p-6', 'rounded-2xl', 'shadow-2xl', 'w-[640px]', 'text-white', 'animate-fadeIn', 'overflow-y-auto', 'max-h-[90vh]')}
        style={{ background: localEvent.background_value || DEFAULT_GRADIENT }}
      >
        <h3 className={cn('text-center', 'text-xl', 'font-bold', 'mb-4')}>⚙ Edit Live Poll</h3>

        {/* TITLES */}
        <label className={cn('block', 'text-sm')}>Poll Title (Private):</label>
        <input
          type="text"
          value={localEvent.host_title || ''}
          onChange={(e) =>
            setLocalEvent({ ...localEvent, host_title: e.target.value })
          }
          className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
        />

        <label className={cn('block', 'text-sm', 'mt-3')}>Public Question:</label>
        <input
          type="text"
          value={localEvent.title || ''}
          onChange={(e) =>
            setLocalEvent({ ...localEvent, title: e.target.value })
          }
          className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
        />

        {/* COUNTDOWN */}
        <label className={cn('block', 'text-sm', 'mt-3')}>Countdown (Before Start):</label>
        <select
          className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
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

        {/* DURATION */}
        <label className={cn('block', 'text-sm', 'mt-3')}>Poll Duration:</label>
        <select
          className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
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

        {/* LAYOUT */}
        <label className={cn('block', 'text-sm', 'mt-3')}>Poll Layout Direction:</label>
        <select
          className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
          value={localEvent.layout || 'horizontal'}
          onChange={(e) =>
            setLocalEvent({
              ...localEvent,
              layout: e.target.value,
            })
          }
        >
          <option value="horizontal">Horizontal (Left to Right)</option>
          <option value="vertical">Vertical (Bottom to Top)</option>
        </select>

        {/* UPLOAD BACKGROUND */}
        <div className="mt-5">
          <label className={cn('block', 'text-sm', 'mb-1')}>Upload Background Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className={cn('text-sm', 'text-gray-300')}
          />
          {uploading && (
            <p className={cn('text-yellow-400', 'text-xs', 'mt-2', 'animate-pulse')}>
              Uploading…
            </p>
          )}
        </div>

        {/* BUTTONS */}
        <div className={cn('flex', 'justify-center', 'gap-3', 'mt-6')}>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className={cn('bg-green-600', 'hover:bg-green-700', 'px-4', 'py-2', 'rounded', 'font-semibold')}
          >
            ✅ Save
          </button>
          <button
            onClick={onClose}
            className={cn('bg-red-600', 'hover:bg-red-700', 'px-4', 'py-2', 'rounded', 'font-semibold')}
          >
            ✖ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
