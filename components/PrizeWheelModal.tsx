'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { cn } from '@/lib/utils';

interface PrizeWheelOptionsModalProps {
  wheel: any;
  hostId: string;
  onClose: () => void;
  refreshPrizeWheels: () => Promise<void>;
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

export default function PrizeWheelOptionsModal({
  wheel,
  hostId,
  onClose,
  refreshPrizeWheels,
}: PrizeWheelOptionsModalProps) {
  const channelRef = useRealtimeChannel();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ----------------------- LOCAL STATE ----------------------- */
  const [localWheel, setLocalWheel] = useState<any>(() => ({
    ...wheel,
    spin_duration: wheel.spin_duration || 10,
    spin_count: wheel.spin_count || 1,
    phone_spin_enabled: wheel.phone_spin_enabled ?? false,

    // NEW
    wedge_color_a: wheel.wedge_color_a || '#1976d2', // light blue
    wedge_color_b: wheel.wedge_color_b || '#0d47a1', // dark blue

    color_start: wheel.color_start || '#0d47a1',
    color_end: wheel.color_end || '#1976d2',
  }));

  function broadcast(event: string, payload: any) {
    const channel = channelRef?.current;
    if (!channel) return;

    channel.send({
      type: 'broadcast',
      event,
      payload,
    }).catch(() => {});
  }

  /* ----------------------- SAVE ----------------------- */
  async function save() {
    try {
      setSaving(true);

      const updates = {
        title: localWheel.title || null,
        host_title: localWheel.host_title || null,
        spin_duration: Number(localWheel.spin_duration),
        spin_count: Number(localWheel.spin_count),
        phone_spin_enabled: localWheel.phone_spin_enabled,
        passphrase: localWheel.passphrase || null,

        wedge_color_a: localWheel.wedge_color_a,
        wedge_color_b: localWheel.wedge_color_b,

        background_type: localWheel.background_type,
        background_value: localWheel.background_value,

        color_start: localWheel.color_start,
        color_end: localWheel.color_end,

        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('prize_wheels')
        .update(updates)
        .eq('id', wheel.id);

      broadcast('wheel_updated', { id: wheel.id, ...updates });

      await refreshPrizeWheels();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------- BACKGROUND: SIMPLE GRADIENT ----------------------- */
  function updateGradient(start: string, end: string) {
    const gradient = `linear-gradient(135deg, ${start}, ${end})`;

    setLocalWheel({
      ...localWheel,
      color_start: start,
      color_end: end,
      background_type: 'gradient',
      background_value: gradient,
    });

    broadcast('wheel_updated', {
      id: wheel.id,
      background_type: 'gradient',
      background_value: gradient,
    });
  }

  /* ----------------------- IMAGE UPLOAD ----------------------- */
  async function handleUpload(e: any) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);

      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const ext = file.name.split('.').pop();
      const filePath = `host_${hostId}/wheel_${wheel.id}/background-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(filePath);

      const url = publicUrlData.publicUrl;

      setLocalWheel({
        ...localWheel,
        background_type: 'image',
        background_value: url,
      });

      broadcast('wheel_updated', {
        id: wheel.id,
        background_type: 'image',
        background_value: url,
      });
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  /* ------------------------------------------------------ */
  /*                        UI                              */
  /* ------------------------------------------------------ */
  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center'
      )}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-[#0f0f19] rounded-2xl p-6 w-[600px] max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl'
        )}
      >
        <h2 className={cn('text-2xl', 'font-bold', 'mb-4')}>🎡 Prize Wheel Settings</h2>

        {/* Titles */}
        <label className={cn('font-semibold', 'mt-3', 'mb-1', 'block')}>Public Title</label>
        <input
          className={cn('w-full', 'p-2', 'rounded', 'bg-black/40', 'border', 'border-white/20')}
          value={localWheel.title || ''}
          onChange={(e) => setLocalWheel({ ...localWheel, title: e.target.value })}
        />

        <label className={cn('font-semibold', 'mt-3', 'mb-1', 'block')}>Host Title</label>
        <input
          className={cn('w-full', 'p-2', 'rounded', 'bg-black/40', 'border', 'border-white/20')}
          value={localWheel.host_title || ''}
          onChange={(e) =>
            setLocalWheel({ ...localWheel, host_title: e.target.value })
          }
        />

        {/* Spin Duration */}
        <label className={cn('font-semibold', 'mt-4', 'mb-1', 'block')}>Spin Duration</label>
        <select
          className={cn('w-full', 'p-2', 'rounded', 'bg-black/40', 'border', 'border-white/20')}
          value={localWheel.spin_duration}
          onChange={(e) =>
            setLocalWheel({ ...localWheel, spin_duration: e.target.value })
          }
        >
          <option value={5}>5 Seconds</option>
          <option value={10}>10 Seconds</option>
          <option value={15}>15 Seconds</option>
        </select>

        {/* Spin Count */}
        <label className={cn('font-semibold', 'mt-4', 'mb-1', 'block')}>Number of Spins</label>
        <select
          className={cn('w-full', 'p-2', 'rounded', 'bg-black/40', 'border', 'border-white/20')}
          value={localWheel.spin_count}
          onChange={(e) =>
            setLocalWheel({ ...localWheel, spin_count: Number(e.target.value) })
          }
        >
          {[1, 2, 3, 5, 10, 15].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {/* Remote Spin */}
        <label className={cn('font-semibold', 'mt-4', 'block')}>Remote Guest Spin</label>
        <select
          className={cn('w-full', 'p-2', 'rounded', 'bg-black/40', 'border', 'border-white/20', 'mt-1')}
          value={localWheel.phone_spin_enabled ? 'on' : 'off'}
          onChange={(e) =>
            setLocalWheel({
              ...localWheel,
              phone_spin_enabled: e.target.value === 'on',
            })
          }
        >
          <option value="off">Disabled</option>
          <option value="on">Enabled</option>
        </select>

        {/* Passphrase */}
        <label className={cn('font-semibold', 'mt-4', 'mb-1', 'block')}>Passphrase</label>
        <input
          className={cn('w-full', 'p-2', 'rounded', 'bg-black/40', 'border', 'border-white/20')}
          value={localWheel.passphrase || ''}
          onChange={(e) =>
            setLocalWheel({ ...localWheel, passphrase: e.target.value })
          }
        />

        {/* Wedge Colors */}
        <h3 className={cn('mt-6', 'mb-2', 'font-bold')}>🎨 Wedge Colors</h3>

        <div className={cn('flex', 'justify-between')}>
          <div>
            <label className={cn('block', 'text-sm', 'mb-1')}>Wedge Color A</label>
            <input
              type="color"
              value={localWheel.wedge_color_a}
              onChange={(e) =>
                setLocalWheel({
                  ...localWheel,
                  wedge_color_a: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={cn('block', 'text-sm', 'mb-1')}>Wedge Color B</label>
            <input
              type="color"
              value={localWheel.wedge_color_b}
              onChange={(e) =>
                setLocalWheel({
                  ...localWheel,
                  wedge_color_b: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Background Section */}
        <h3 className={cn('mt-6', 'mb-2', 'font-bold')}>🎨 Background</h3>

        <div className={cn('flex', 'gap-3')}>
          <button
            className={cn('px-3', 'py-2', 'bg-blue-600', 'hover:bg-blue-700', 'rounded')}
            onClick={() => updateGradient(localWheel.color_start, localWheel.color_end)}
          >
            Gradient
          </button>

          <button
            className={cn('px-3', 'py-2', 'bg-green-600', 'hover:bg-green-700', 'rounded')}
            onClick={() => fileRef.current?.click()}
          >
            Upload Image
          </button>

          <input
            type="file"
            ref={fileRef}
            onChange={handleUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Gradient Pickers */}
        <div className={cn('mt-4', 'flex', 'justify-between')}>
          <div>
            <label className={cn('block', 'text-sm', 'mb-1')}>Color Start</label>
            <input
              type="color"
              value={localWheel.color_start}
              onChange={(e) => updateGradient(e.target.value, localWheel.color_end)}
            />
          </div>

          <div>
            <label className={cn('block', 'text-sm', 'mb-1')}>Color End</label>
            <input
              type="color"
              value={localWheel.color_end}
              onChange={(e) => updateGradient(localWheel.color_start, e.target.value)}
            />
          </div>
        </div>

        {/* Save / Close */}
        <div className={cn('flex', 'justify-between', 'mt-8')}>
          <button
            onClick={save}
            disabled={saving}
            className={cn('px-5', 'py-2', 'bg-blue-600', 'hover:bg-blue-700', 'rounded', 'text-white')}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            onClick={onClose}
            className={cn('px-5', 'py-2', 'bg-gray-500', 'hover:bg-gray-600', 'rounded', 'text-white')}
          >
            Close
          </button>
        </div>

        {uploading && (
          <p className={cn('text-center', 'text-yellow-400', 'text-xs', 'mt-3', 'animate-pulse')}>
            Uploading…
          </p>
        )}
      </div>
    </div>
  );
}
