'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { cn } from "../lib/utils";

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

/* -------------------------------------------------------- */
/* ✅ BRIGHTNESS APPLIES ONLY TO GRADIENT */
/* -------------------------------------------------------- */
function applyBrightnessToGradient(gradient: string, brightness: number) {
  if (!gradient?.includes('linear-gradient')) return gradient;
  const mult = brightness / 100;

  return gradient.replace(/(#\w{6})(\w{2})/g, (match, hex, alpha) => {
    const base = alpha ? parseInt(alpha, 16) : 255;
    const newA = Math.min(255, Math.max(0, base * mult));
    return `${hex}${Math.round(newA).toString(16).padStart(2, '0')}`;
  });
}

/* -------------------------------------------------------- */
/* ✅ BUILD GRADIENT (identical to Fan Wall) */
/* -------------------------------------------------------- */
function buildPrizeWheelGradient(start: string, end: string, pos: number, brightness: number) {
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
  `.replace(/\s+/g, " ");

  return applyBrightnessToGradient(g, brightness);
}

/* -------------------------------------------------------- */
/* ✅ COMPONENT */
/* -------------------------------------------------------- */
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

  /* ✅ Default these fields for wheels too */
  const [localWheel, setLocalWheel] = useState<any>(() => {
    const start = event.color_start || '#0d47a1';
    const end = event.color_end || '#1976d2';
    const pos = event.gradient_pos || 60;
    const brightness = event.background_brightness ?? 100;

    const gradient = buildPrizeWheelGradient(start, end, pos, brightness);

    return {
      ...event,
      color_start: start,
      color_end: end,
      gradient_pos: pos,
      background_brightness: brightness,
      background_type: event.background_type || 'gradient',
      background_value: event.background_value || gradient,
    };
  });

  /* -------------------------------------------------------- */
  /* ✅ IMAGE UPLOAD (matching Fan Wall behavior) */
  /* -------------------------------------------------------- */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Please upload a JPG, PNG, or WEBP file.');
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setLocalWheel({
        ...localWheel,
        background_type: 'image',
        background_value: previewUrl,
      });

      setUploading(true);

      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1900,
        useWebWorker: true,
      });

      const ext = file.type.split('/')[1];
      const filePath = `host_${hostId}/prizewheel_${event.id}/background-${Date.now()}.${ext}`;

      await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });

      const { data: publicUrl } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(filePath);

      const finalUrl = publicUrl.publicUrl;

      await supabase
        .from('prize_wheels')
        .update({
          background_type: 'image',
          background_value: finalUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      setLocalWheel({
        ...localWheel,
        background_type: 'image',
        background_value: finalUrl,
      });

      await refreshPrizeWheels?.();
    } catch (err) {
      console.error('❌ Upload failed:', err);
      alert('Upload failed. Check console.');
    } finally {
      setUploading(false);
    }
  }

  /* -------------------------------------------------------- */
  /* ✅ DELETE BACKGROUND */
  /* -------------------------------------------------------- */
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

      setLocalWheel(prev => ({
        ...prev,
        background_type: 'gradient',
        background_value: DEFAULT_GRADIENT,
      }));

      await refreshPrizeWheels?.();
    } catch (err) {
      console.error('❌ Delete Error:', err);
    }
  }

  /* -------------------------------------------------------- */
  /* ✅ SAVE */
  /* -------------------------------------------------------- */
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
        passphrase:
          localWheel.visibility === 'private'
            ? localWheel.passphrase || null
            : null,
        spin_speed: localWheel.spin_speed || 'Medium',
        countdown:
          localWheel.countdown === 'none' ? null : String(localWheel.countdown),
        countdown_active: false,

        /* ✅ NEW from Fan Wall */
        background_type: localWheel.background_type,
        background_value: finalBg,
        color_start: localWheel.color_start,
        color_end: localWheel.color_end,
        gradient_pos: localWheel.gradient_pos,
        background_brightness: localWheel.background_brightness,

        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('prize_wheels')
        .update(updates)
        .eq('id', localWheel.id);

      await refreshPrizeWheels?.();
      onClose();
    } catch (err) {
      console.error('❌ Error saving wheel:', err);
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------- */
  /* ✅ UI */
  /* -------------------------------------------------------- */
  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center animate-fadeIn'
      )}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-[960px] max-h-[90vh] overflow-hidden rounded-2xl',
          'border border-blue-500/30 shadow-[0_0_40px_rgba(0,140,255,0.45)]',
          'bg-gradient-to-br from-[#0b0f1a]/95 to-[#111827]/95 animate-zoomIn p-6'
        )}
      >

        {/* Close */}
        <button
          onClick={onClose}
          className={cn('absolute top-3 right-3 text-white/80 hover:text-white text-xl')}
        >
          ✕
        </button>

        <div className={cn('overflow-y-auto max-h-[75vh] pr-1')}>
          <h3 className={cn('text-center text-xl font-bold mb-3')}>
            Edit Prize Wheel
          </h3>

          {/* ---------------- Titles ---------------- */}
          <div className={cn('w-full max-w-[520px] mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Title (Private)</label>
            <input
              type="text"
              value={localWheel.host_title || ''}
              onChange={(e) =>
                setLocalWheel({ ...localWheel, host_title: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            />
          </div>

          <div className={cn('w-full max-w-[520px] mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Public Title</label>
            <input
              type="text"
              value={localWheel.title || ''}
              onChange={(e) =>
                setLocalWheel({ ...localWheel, title: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            />
          </div>

          {/* ---------------- Visibility ---------------- */}
          <div className={cn('w-full max-w-[520px] mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Visibility</label>
            <select
              value={localWheel.visibility}
              onChange={(e) =>
                setLocalWheel({ ...localWheel, visibility: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            >
              <option value="public">Public</option>
              <option value="private">Private (passphrase)</option>
            </select>
          </div>

          {localWheel.visibility === 'private' && (
            <div className={cn('w-full max-w-[520px] mx-auto')}>
              <label className={cn('block', 'mt-3', 'text-sm')}>Passphrase</label>
              <input
                type="text"
                value={localWheel.passphrase || ''}
                onChange={(e) =>
                  setLocalWheel({ ...localWheel, passphrase: e.target.value })
                }
                className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
              />
            </div>
          )}

          {/* ---------------- Spin Speed ---------------- */}
          <div className={cn('w-full max-w-[520px] mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Spin Speed</label>
            <select
              value={localWheel.spin_speed || 'Medium'}
              onChange={(e) =>
                setLocalWheel({ ...localWheel, spin_speed: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded', 'rounded-md', 'text-black', 'mt-1')}
            >
              <option value="Quick">Quick</option>
              <option value="Medium">Medium</option>
              <option value="Long">Long</option>
            </select>
          </div>

          {/* ---------------- Countdown ---------------- */}
          <div className={cn('w-full max-w-[520px] mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Countdown</label>
            <select
              value={localWheel.countdown || 'none'}
              onChange={(e) =>
                setLocalWheel({ ...localWheel, countdown: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            >
              <option value="none">No Countdown / Start Immediately</option>
              <option>30 Seconds</option>
              <option>1 Minute</option>
              <option>2 Minutes</option>
              <option>3 Minutes</option>
              <option>4 Minutes</option>
              <option>5 Minutes</option>
            </select>
          </div>

          {/* ---------------- Background Preview ---------------- */}
          <div className={cn('w-full max-w-[520px] mx-auto mt-6 text-center')}>
            <div
              className={cn(
                'mx-auto w-[140px] h-[80px] rounded-md border border-white/20 shadow-inner'
              )}
              style={{
                background:
                  localWheel.background_type === 'image'
                    ? `url(${localWheel.background_value}) center/cover no-repeat`
                    : localWheel.background_value,
              }}
            />
            <p className={cn('text-xs', 'text-gray-300', 'mt-2')}>
              {localWheel.background_type === 'image'
                ? 'Current Background Image'
                : 'Current Gradient Background'}
            </p>

            {localWheel.background_type === 'image' && (
              <div className={cn('text-xs text-white/80 mt-2 break-all')}>
                {String(localWheel.background_value || '').split('/').pop()}
              </div>
            )}
          </div>

          {/* ---------------- Gradient Sliders & Color Pickers ---------------- */}
          <div className={cn('w-full max-w-[520px] mx-auto mt-6')}>
            <div className={cn('flex', 'justify-center', 'gap-6')}>
              {/* Left Color */}
              <div>
                <label className={cn('block', 'text-xs', 'mb-1')}>Left Color</label>
                <input
                  type="color"
                  value={localWheel.color_start}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const g = buildPrizeWheelGradient(
                      newStart,
                      localWheel.color_end,
                      localWheel.gradient_pos,
                      localWheel.background_brightness
                    );

                    setLocalWheel(prev => ({
                      ...prev,
                      color_start: newStart,
                      background_type: 'gradient',
                      background_value: g,
                    }));
                  }}
                />
              </div>

              {/* Right Color */}
              <div>
                <label className={cn('block', 'text-xs', 'mb-1')}>Right Color</label>
                <input
                  type="color"
                  value={localWheel.color_end}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    const g = buildPrizeWheelGradient(
                      localWheel.color_start,
                      newEnd,
                      localWheel.gradient_pos,
                      localWheel.background_brightness
                    );

                    setLocalWheel(prev => ({
                      ...prev,
                      color_end: newEnd,
                      background_type: 'gradient',
                      background_value: g,
                    }));
                  }}
                />
              </div>
            </div>

            {/* Gradient Position */}
            <div className={cn('mt-5', 'flex', 'flex-col', 'items-center')}>
              <label className={cn('text-xs', 'mb-1')}>Gradient Position</label>

              <div className={cn('w-[140px]', 'p-2', 'rounded-md', 'shadow-[0_0_15px_rgba(0,140,255,0.35)]', 'bg-[#0f172a]/40', 'backdrop-blur-sm')}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localWheel.gradient_pos}
                  onChange={(e) => {
                    const pos = Number(e.target.value);
                    const g = buildPrizeWheelGradient(
                      localWheel.color_start,
                      localWheel.color_end,
                      pos,
                      localWheel.background_brightness
                    );

                    setLocalWheel(prev => ({
                      ...prev,
                      gradient_pos: pos,
                      background_type: 'gradient',
                      background_value: g,
                    }));
                  }}
                  className={cn('w-full', 'accent-blue-400')}
                />
              </div>

              <p className={cn('text-xs', 'mt-1')}>{localWheel.gradient_pos}%</p>
            </div>

            {/* Brightness */}
            <div className={cn('mt-5', 'flex', 'flex-col', 'items-center')}>
              <label className={cn('text-xs', 'mb-1')}>Background Brightness</label>

              <div className={cn('w-[140px]', 'p-2', 'rounded-md', 'shadow-[0_0_15px_rgba(0,140,255,0.35)]', 'bg-[#0f172a]/40', 'backdrop-blur-sm')}>
                <input
                  type="range"
                  min="20"
                  max="150"
                  value={localWheel.background_brightness}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const g = buildPrizeWheelGradient(
                      localWheel.color_start,
                      localWheel.color_end,
                      localWheel.gradient_pos,
                      val
                    );

                    setLocalWheel(prev => ({
                      ...prev,
                      background_brightness: val,
                      background_type: 'gradient',
                      background_value: g,
                    }));
                  }}
                  className={cn('w-full', 'accent-blue-400')}
                />
              </div>

              <p className={cn('text-xs', 'mt-1')}>{localWheel.background_brightness}%</p>
            </div>
          </div>

          {/* ---------------- Upload Button (Fan Wall Style) ---------------- */}
          <div className={cn('mt-6 flex flex-col items-center w-full')}>
            <p className={cn('text-sm', 'font-semibold', 'mb-2')}>Upload Background</p>

            <label
              htmlFor="fileUpload"
              className={cn(
                "px-4 py-2 rounded-md",
                "bg-blue-600 hover:bg-blue-700",
                "text-white font-semibold cursor-pointer text-center"
              )}
            >
              Choose File
            </label>

            <input
              id="fileUpload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />

            <p className={cn('text-xs', 'text-gray-300', 'mt-2', 'text-center')}>
              {uploading
                ? "Uploading..."
                : localWheel.background_type === "image"
                ? localWheel.background_value?.split('/').pop()
                : "No file chosen"}
            </p>

            {localWheel.background_type === "image" && (
              <button
                onClick={handleDeleteImage}
                className={cn(
                  "mt-3 bg-red-600 hover:bg-red-700",
                  "px-3 py-1 rounded text-xs font-semibold"
                )}
              >
                🗑 Delete Background Image
              </button>
            )}
          </div>

          {/* ---------------- Buttons ---------------- */}
          <div className={cn('text-center mt-6 flex justify-center gap-4')}>
            <button
              disabled={saving}
              onClick={handleSave}
              className={cn(
                saving ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700',
                'px-4 py-2 rounded font-semibold'
              )}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

            <button
              onClick={onClose}
              className={cn('bg-red-600', 'hover:bg-red-700', 'px-4', 'py-2', 'rounded', 'font-semibold')}
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
