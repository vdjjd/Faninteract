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
  const [uploading, setUploading] = useState(false);
  const [localEvent, setLocalEvent] = useState<any>({ ...event });

  async function handleSave() {
    try {
      await supabase
        .from('events')
        .update({
          title: localEvent.title || '',
          countdown: localEvent.countdown || null,
          background_type: localEvent.background_type || 'gradient',
          background_value: localEvent.background_value || DEFAULT_GRADIENT,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localEvent.id);

      await refreshEvents();
      onClose();
    } catch (err) {
      console.error('❌ Error saving fan wall:', err);
    }
  }

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

      const { data: publicUrl } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(filePath);

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
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleBackgroundChange(
    type: 'solid' | 'gradient',
    value: string
  ) {
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
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
      <div
        className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-[640px] text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
        style={{ background: localEvent.background_value || DEFAULT_GRADIENT }}
      >
        <h3 className="text-center text-xl font-bold mb-4">⚙ Edit Fan Zone Wall</h3>

        <label className="block text-sm">Wall Title:</label>
        <input
          type="text"
          value={localEvent.title || ''}
          onChange={(e) => setLocalEvent({ ...localEvent, title: e.target.value })}
          className="w-full p-2 rounded-md text-black mt-1"
        />

        <label className="block text-sm mt-4">Countdown Timer:</label>
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
          <option value="none">No Countdown</option>
          <option value="30 Seconds">30 Seconds</option>
          <option value="1 Minute">1 Minute</option>
          <option value="2 Minutes">2 Minutes</option>
        </select>

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
          <p className="text-sm font-semibold mb-2">Upload Custom Background</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
          />
          {uploading && (
            <p className="text-yellow-400 text-xs mt-2 animate-pulse">
              Uploading...
            </p>
          )}
        </div>

        <div className="text-center mt-6 flex justify-center gap-4">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
          >
            💾 Save
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
