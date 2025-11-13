'use client';

import { useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import Modal from './Modal';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

/* ---------- BRIGHTNESS ---------- */
function applyBrightnessToGradient(gradient: string, brightness: number) {
  if (!gradient?.includes('linear-gradient')) return gradient;
  const mult = brightness / 100;
  return gradient.replace(/(#\w{6})(\w{2})/g, (match, hex, alpha) => {
    const base = alpha ? parseInt(alpha, 16) : 255;
    const newA = Math.min(255, Math.max(0, base * mult));
    return `${hex}${Math.round(newA).toString(16).padStart(2, '0')}`;
  });
}

/* ---------- BUILD GRADIENT ---------- */
function buildGradient(start: string, end: string, pos: number, brightness: number) {
  const mid1 = pos;
  const mid2 = Math.min(pos + 15, 100);
  const g = `
    linear-gradient(
      135deg,
      ${start} 0%,
      ${start}cc ${mid1}%,
      ${end}99 ${mid2}%,
      ${end} 100%
    )
  `.replace(/\s+/g, ' ');
  return applyBrightnessToGradient(g, brightness);
}

/* -------------------------------------------------------------------------- */
/* ✅ OPTIONS MODAL - PRIZE WHEEL (Poll-modal styling + scrollable)           */
/* -------------------------------------------------------------------------- */
export default function OptionsModalPrizeWheel({
  event,
  hostId,
  onClose,
  refreshPrizeWheels,
}: {
  event: any;
  hostId: string;
  onClose: () => void;
  refreshPrizeWheels: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [localWheel, setLocalWheel] = useState<any | null>(null);

  useEffect(() => {
    if (!event) return;
    const start = event.color_start || '#0d47a1';
    const end = event.color_end || '#1976d2';
    const pos = event.gradient_pos ?? 60;
    const bright = event.background_brightness ?? 100;
    const gradient = buildGradient(start, end, pos, bright);

    setLocalWheel({
      ...event,
      color_start: start,
      color_end: end,
      gradient_pos: pos,
      background_brightness: bright,
      background_type: event.background_type || 'gradient',
      background_value: event.background_value || gradient,
      tile_glow_color: event.tile_glow_color || '#ffffff',
      tile_color_a: event.tile_color_a || '#ffffff',
      tile_color_b: event.tile_color_b || '#ffffff',
      tile_brightness_a: event.tile_brightness_a ?? 100,
      tile_brightness_b: event.tile_brightness_b ?? 100,
      remote_spin_enabled: event.remote_spin_enabled ?? false,
      countdown: event.countdown || 'none',
    });
  }, [event]);

  if (!localWheel) return null;

  /* ------------------------------------------------------------
     ✅ Upload background image
  ------------------------------------------------------------ */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Please upload a JPG, PNG, or WEBP.');
        return;
      }
      setUploading(true);

      // Local preview while uploading
      const preview = URL.createObjectURL(file);
      setLocalWheel({ ...localWheel, background_type: 'image', background_value: preview });

      // Compress & upload
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1900,
        useWebWorker: true,
      });

      const ext = file.type.split('/')[1];
      const path = `host_${hostId}/prizewheel_${event.id}/background-${Date.now()}.${ext}`;

      await supabase.storage.from('wall-backgrounds').upload(path, compressed, { upsert: true });
      const { data } = supabase.storage.from('wall-backgrounds').getPublicUrl(path);
      const finalUrl = data.publicUrl;

      // Save to DB
      await supabase
        .from('prize_wheels')
        .update({
          background_type: 'image',
          background_value: finalUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      setLocalWheel({ ...localWheel, background_type: 'image', background_value: finalUrl });
      await refreshPrizeWheels?.();
    } catch (err) {
      console.error('❌ Upload Error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  /* ------------------------------------------------------------
     ✅ Delete background image (revert to gradient)
  ------------------------------------------------------------ */
  async function handleDeleteImage() {
    try {
      await supabase
        .from('prize_wheels')
        .update({
          background_type: 'gradient',
          background_value: DEFAULT_GRADIENT,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      setLocalWheel({
        ...localWheel,
        background_type: 'gradient',
        background_value: DEFAULT_GRADIENT,
      });
    } catch (err) {
      console.error('❌ Delete Error:', err);
    }
  }

  /* ------------------------------------------------------------
     ✅ Save changes
  ------------------------------------------------------------ */
  async function handleSave() {
    try {
      setSaving(true);

      const finalBg =
        localWheel.background_type === 'gradient'
          ? applyBrightnessToGradient(localWheel.background_value, localWheel.background_brightness)
          : localWheel.background_value;

      const updates = {
        title: localWheel.title?.trim() || null,
        host_title: localWheel.host_title?.trim() || null,
        visibility: localWheel.visibility,
        passphrase: localWheel.visibility === 'private' ? localWheel.passphrase || null : null,

        remote_spin_enabled: !!localWheel.remote_spin_enabled,

        countdown: localWheel.countdown === 'none' ? null : String(localWheel.countdown),
        countdown_active: false,

        background_type: localWheel.background_type,
        background_value: finalBg,
        color_start: localWheel.color_start,
        color_end: localWheel.color_end,
        gradient_pos: localWheel.gradient_pos,
        background_brightness: localWheel.background_brightness,

        tile_glow_color: localWheel.tile_glow_color,
        tile_color_a: localWheel.tile_color_a,
        tile_color_b: localWheel.tile_color_b,
        tile_brightness_a: localWheel.tile_brightness_a,
        tile_brightness_b: localWheel.tile_brightness_b,

        updated_at: new Date().toISOString(),
      };

      await supabase.from('prize_wheels').update(updates).eq('id', localWheel.id);

      await refreshPrizeWheels?.();
      onClose();
    } catch (err) {
      console.error('❌ Error saving wheel:', err);
      alert('Error saving changes');
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------
     ✅ UI — Poll-modal look + internal scroll + sticky footer
  ------------------------------------------------------------ */
  return (
    <Modal isOpen={!!event} onClose={onClose}>
      <div className={cn('space-y-4 text-white max-h-[80vh] overflow-y-auto pr-2')}>
        <h2 className={cn('text-xl font-semibold text-center mb-2')}>
          ⚙ Edit Prize Wheel
        </h2>

        {/* PRIVATE TITLE */}
        <div>
          <label className={cn('block text-sm font-semibold mb-1')}>Private Title</label>
          <input
            type="text"
            value={localWheel.host_title || ''}
            onChange={(e) => setLocalWheel({ ...localWheel, host_title: e.target.value })}
            className={cn('w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10')}
          />
        </div>

        {/* PUBLIC TITLE */}
        <div>
          <label className={cn('block text-sm font-semibold mb-1')}>Public Title</label>
          <input
            type="text"
            value={localWheel.title || ''}
            onChange={(e) => setLocalWheel({ ...localWheel, title: e.target.value })}
            className={cn('w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10')}
          />
        </div>

        {/* VISIBILITY */}
        <div>
          <label className={cn('block text-sm font-semibold mb-1')}>Visibility</label>
          <select
            value={localWheel.visibility}
            onChange={(e) => setLocalWheel({ ...localWheel, visibility: e.target.value })}
            className={cn('w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white')}
          >
            <option value="public">Public</option>
            <option value="private">Private (passphrase)</option>
          </select>
        </div>

        {localWheel.visibility === 'private' && (
          <div>
            <label className={cn('block text-sm font-semibold mb-1')}>Passphrase</label>
            <input
              type="text"
              value={localWheel.passphrase || ''}
              onChange={(e) => setLocalWheel({ ...localWheel, passphrase: e.target.value })}
              className={cn('w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10')}
            />
          </div>
        )}

        {/* REMOTE SPIN */}
        <div>
          <label className={cn('block text-sm font-semibold mb-1')}>Phone Spin Activation</label>
          <select
            value={localWheel.remote_spin_enabled ? 'yes' : 'no'}
            onChange={(e) =>
              setLocalWheel({ ...localWheel, remote_spin_enabled: e.target.value === 'yes' })
            }
            className={cn('w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white')}
          >
            <option value="no">Disabled</option>
            <option value="yes">Enabled</option>
          </select>
        </div>

        {/* COUNTDOWN */}
        <div>
          <label className={cn('block text-sm font-semibold mb-1')}>Countdown</label>
          <select
            value={localWheel.countdown || 'none'}
            onChange={(e) => setLocalWheel({ ...localWheel, countdown: e.target.value })}
            className={cn('w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white')}
          >
            <option value="none">No Countdown</option>
            <option value="30 Seconds">30 Seconds</option>
            <option value="1 Minute">1 Minute</option>
            <option value="2 Minutes">2 Minutes</option>
            <option value="3 Minutes">3 Minutes</option>
            <option value="4 Minutes">4 Minutes</option>
            <option value="5 Minutes">5 Minutes</option>
          </select>
        </div>

        {/* BACKGROUND PREVIEW */}
        <div className={cn('mt-2 text-center')}>
          <div
            className={cn(
              'w-[140px] h-[80px] rounded-md border border-white/20 shadow-inner mx-auto'
            )}
            style={{
              background:
                localWheel.background_type === 'image'
                  ? `url(${localWheel.background_value}) center/cover no-repeat`
                  : localWheel.background_value,
            }}
          />
          <p className={cn('text-xs text-gray-300 mt-2')}>
            {localWheel.background_type === 'image'
              ? 'Current Background Image'
              : 'Current Gradient Background'}
          </p>
        </div>

        {/* COLOR PICKERS */}
        <div className={cn('flex justify-center gap-6 mt-4')}>
          <div>
            <label className={cn('block text-xs mb-1')}>Left Color</label>
            <input
              type="color"
              value={localWheel.color_start}
              onChange={(e) => {
                const newStart = e.target.value;
                const g = buildGradient(newStart, localWheel.color_end, localWheel.gradient_pos, localWheel.background_brightness);
                setLocalWheel({
                  ...localWheel,
                  color_start: newStart,
                  background_type: 'gradient',
                  background_value: g,
                });
              }}
            />
          </div>
          <div>
            <label className={cn('block text-xs mb-1')}>Right Color</label>
            <input
              type="color"
              value={localWheel.color_end}
              onChange={(e) => {
                const newEnd = e.target.value;
                const g = buildGradient(localWheel.color_start, newEnd, localWheel.gradient_pos, localWheel.background_brightness);
                setLocalWheel({
                  ...localWheel,
                  color_end: newEnd,
                  background_type: 'gradient',
                  background_value: g,
                });
              }}
            />
          </div>
        </div>

        {/* GRADIENT POSITION */}
        <div className={cn('flex flex-col items-center mt-4')}>
          <label className={cn('text-xs mb-1')}>Gradient Position</label>
          <input
            type="range"
            min="0"
            max="100"
            value={localWheel.gradient_pos}
            onChange={(e) => {
              const pos = Number(e.target.value);
              const g = buildGradient(localWheel.color_start, localWheel.color_end, pos, localWheel.background_brightness);
              setLocalWheel({
                ...localWheel,
                gradient_pos: pos,
                background_type: 'gradient',
                background_value: g,
              });
            }}
            className={cn('w-[140px] accent-blue-400')}
          />
          <p className={cn('text-xs mt-1')}>{localWheel.gradient_pos}%</p>
        </div>

        {/* BACKGROUND BRIGHTNESS */}
        <div className={cn('flex flex-col items-center mt-4')}>
          <label className={cn('text-xs mb-1')}>Background Brightness</label>
          <input
            type="range"
            min="20"
            max="150"
            value={localWheel.background_brightness}
            onChange={(e) => {
              const val = Number(e.target.value);
              const g = buildGradient(localWheel.color_start, localWheel.color_end, localWheel.gradient_pos, val);
              setLocalWheel({
                ...localWheel,
                background_brightness: val,
                background_type: 'gradient',
                background_value: g,
              });
            }}
            className={cn('w-[140px] accent-blue-400')}
          />
          <p className={cn('text-xs mt-1')}>{localWheel.background_brightness}%</p>
        </div>

        {/* TILE COLORS & GLOW */}
        <p className={cn('text-red-400 text-xs text-center mt-6 mb-2')}>
          These must be selected before the wheel window is launched.
        </p>

        <div className={cn('w-full max-w-[520px] mx-auto mt-2 flex justify-center')}>
          <div
            className={cn(
              'flex flex-row gap-12 p-4 rounded-xl border border-white/10 bg-black/20 shadow-inner'
            )}
          >
            {/* Glow */}
            <div className={cn('flex flex-col items-center')}>
              <label className={cn('text-sm font-semibold mb-2')}>Glow</label>
              <input
                type="color"
                value={localWheel.tile_glow_color}
                onChange={(e) => setLocalWheel({ ...localWheel, tile_glow_color: e.target.value })}
                className={cn('w-10 h-10 rounded-md border border-white/20')}
              />
              <div
                className={cn('h-10 w-16 mt-2 rounded-md border border-white/20')}
                style={{ background: '#111', boxShadow: `0 0 20px ${localWheel.tile_glow_color}` }}
              />
            </div>

            {/* Tile A */}
            <div className={cn('flex flex-col items-center')}>
              <label className={cn('text-sm font-semibold mb-2')}>Tile A</label>
              <input
                type="color"
                value={localWheel.tile_color_a}
                onChange={(e) => setLocalWheel({ ...localWheel, tile_color_a: e.target.value })}
                className={cn('w-10 h-10 rounded-md border border-white/20')}
              />
              <div
                className={cn('h-10 w-16 mt-2 rounded-md border border-white/20')}
                style={{ background: localWheel.tile_color_a, opacity: localWheel.tile_brightness_a / 100 }}
              />
            </div>

            {/* Tile B */}
            <div className={cn('flex flex-col items-center')}>
              <label className={cn('text-sm font-semibold mb-2')}>Tile B</label>
              <input
                type="color"
                value={localWheel.tile_color_b}
                onChange={(e) => setLocalWheel({ ...localWheel, tile_color_b: e.target.value })}
                className={cn('w-10 h-10 rounded-md border border-white/20')}
              />
              <div
                className={cn('h-10 w-16 mt-2 rounded-md border border-white/20')}
                style={{ background: localWheel.tile_color_b, opacity: localWheel.tile_brightness_b / 100 }}
              />
            </div>
          </div>
        </div>

        {/* TILE BRIGHTNESS */}
        <div className={cn('w-full max-w-[520px] mx-auto mt-6')}>
          {/* A */}
          <div className={cn('mb-4 flex flex-col items-center')}>
            <label className={cn('block text-xs mb-1')}>Tile A Brightness</label>
            <div className={cn('w-[160px] p-2 rounded-md bg-[#0f172a]/40 shadow-inner')}>
              <input
                type="range"
                min="20"
                max="150"
                value={localWheel.tile_brightness_a}
                onChange={(e) =>
                  setLocalWheel({ ...localWheel, tile_brightness_a: Number(e.target.value) })
                }
                className={cn('w-full accent-blue-400')}
              />
            </div>
          </div>

          {/* B */}
          <div className={cn('mb-2 flex flex-col items-center')}>
            <label className={cn('block text-xs mb-1')}>Tile B Brightness</label>
            <div className={cn('w-[160px] p-2 rounded-md bg-[#0f172a]/40 shadow-inner')}>
              <input
                type="range"
                min="20"
                max="150"
                value={localWheel.tile_brightness_b}
                onChange={(e) =>
                  setLocalWheel({ ...localWheel, tile_brightness_b: Number(e.target.value) })
                }
                className={cn('w-full accent-blue-400')}
              />
            </div>
          </div>
        </div>

        {/* IMAGE UPLOAD / DELETE */}
        <div className={cn('flex flex-col items-center mt-4')}>
          <p className={cn('text-sm font-semibold mb-2')}>Upload Background</p>
          <label
            htmlFor="pw-fileUpload"
            className={cn(
              'px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer'
            )}
          >
            Choose File
          </label>
          <input
            id="pw-fileUpload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className={cn('text-xs text-gray-300 mt-2 text-center')}>
            {uploading
              ? 'Uploading...'
              : localWheel.background_type === 'image'
              ? localWheel.background_value?.split('/').pop()
              : 'No file chosen'}
          </p>

          {localWheel.background_type === 'image' && (
            <button
              onClick={handleDeleteImage}
              className={cn(
                'mt-3 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs font-semibold'
              )}
            >
              🗑 Delete Background Image
            </button>
          )}
        </div>

        {/* STICKY FOOTER */}
        <div
          className={cn(
            'flex justify-between items-center pt-2 border-t border-white/10',
            'sticky bottom-0 bg-[#0b0f1a]/90 backdrop-blur-sm py-2'
          )}
        >
          <button
            onClick={handleDeleteImage}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm bg-red-600/80 hover:bg-red-700 font-medium'
            )}
          >
            Delete Background
          </button>

          <div className={cn('flex gap-2')}>
            <button
              onClick={onClose}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/15 font-medium'
              )}
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={handleSave}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm border font-medium',
                saving
                  ? 'opacity-60 cursor-wait'
                  : 'bg-emerald-600/80 border-emerald-500 hover:bg-emerald-600'
              )}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
