'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { cn } from "../lib/utils";

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

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

  const [localWheel, setLocalWheel] = useState<any>(() => ({
    ...event,
    color_start: '#0d47a1',
    color_end: '#1976d2',
  }));

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  /* ---------------- BACKGROUND UPLOAD ---------------- */
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
        maxWidthOrHeight: 1920,
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

      const imageUrl = publicUrl.publicUrl;

      await supabase
        .from('prize_wheels')
        .update({
          background_type: 'image',
          background_value: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      setLocalWheel({
        ...localWheel,
        background_type: 'image',
        background_value: imageUrl,
      });

      await refreshPrizeWheels?.();
    } catch (err) {
      console.error('❌ Upload failed:', err);
      alert('Upload failed. Check console.');
    } finally {
      setUploading(false);
    }
  }

  /* ---------------- GRADIENT CHANGE ---------------- */
  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    setLocalWheel({
      ...localWheel,
      background_type: type,
      background_value: value,
    });

    await supabase
      .from('prize_wheels')
      .update({
        background_type: type,
        background_value: value || DEFAULT_GRADIENT,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localWheel.id);

    await refreshPrizeWheels?.();
  }

  /* ---------------- SAVE ---------------- */
  async function handleSave() {
    try {
      setSaving(true);

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
        background_type: localWheel.background_type,
        background_value:
          localWheel.background_value || DEFAULT_GRADIENT,
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

  /* ---------------- MODAL ---------------- */
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

          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
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
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
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
            <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
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
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Spin Speed</label>
            <select
              value={localWheel.spin_speed || 'Medium'}
              onChange={(e) =>
                setLocalWheel({ ...localWheel, spin_speed: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded', 'text-black', 'mt-1')}
            >
              <option value="Quick">Quick</option>
              <option value="Medium">Medium</option>
              <option value="Long">Long</option>
            </select>
          </div>

          {/* ---------------- Countdown ---------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
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

          {/* ---------------- Background Thumbnail ---------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto', 'mt-6', 'text-center')}>
            <div
              className={cn(
                'mx-auto w-[140px] rounded-md border border-white/10 shadow-inner',
                'overflow-hidden aspect-[16/9]'
              )}
              style={{
                background:
                  localWheel.background_type === 'image'
                    ? `url(${localWheel.background_value}) center/cover no-repeat`
                    : localWheel.background_value || DEFAULT_GRADIENT,
              }}
            />

            {localWheel.background_type === 'image' && (
              <div className={cn('text-xs', 'text-white/80', 'mt-2', 'break-all')}>
                <div className="opacity-70">File Name</div>
                <div className="font-semibold">
                  {(() => {
                    try {
                      const raw = String(localWheel.background_value || '');
                      const clean = raw.split('?')[0];
                      return clean.split('/').pop() || 'background.webp';
                    } catch {
                      return 'background.webp';
                    }
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* ---------------- Gradient Picker ---------------- */}
          <div className={cn('mt-6', 'w-full', 'max-w-[520px]', 'mx-auto')}>
            <div className={cn('flex', 'justify-center', 'gap-4', 'mb-3')}>
              {/* Left Color */}
              <div>
                <label className={cn('block', 'text-xs', 'mb-1')}>Left Color</label>
                <input
                  type="color"
                  value={localWheel.color_start}
                  onChange={(e) => {
                    const start = e.target.value;
                    const end = localWheel.color_end;

                    const gradient = `
                      linear-gradient(
                        135deg,
                        ${start} 0%,
                        ${start}80 20%,
                        ${end}60 50%,
                        ${end} 100%
                      )
                    `.replace(/\s+/g, ' ');

                    setLocalWheel({
                      ...localWheel,
                      background_type: 'gradient',
                      background_value: gradient,
                      color_start: start,
                    });

                    handleBackgroundChange('gradient', gradient);
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
                    const end = e.target.value;
                    const start = localWheel.color_start;

                    const gradient = `
                      linear-gradient(
                        135deg,
                        ${start} 0%,
                        ${start}80 20%,
                        ${end}60 50%,
                        ${end} 100%
                      )
                    `.replace(/\s+/g, ' ');

                    setLocalWheel({
                      ...localWheel,
                      background_type: 'gradient',
                      background_value: gradient,
                      color_end: end,
                    });

                    handleBackgroundChange('gradient', gradient);
                  }}
                />
              </div>
            </div>
          </div>

          {/* ---------------- Upload ---------------- */}
          <div className={cn('mt-6', 'text-center', 'w-full', 'max-w-[520px]', 'mx-auto')}>
            <p className={cn('text-sm', 'font-semibold', 'mb-2')}>Upload Background</p>
            <p className={cn('text-red-400', 'text-xs', 'mt-1', 'mb-2')}>
              1920 × 1080 recommended
            </p>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="w-full"
            />

            {uploading && (
              <p className={cn('text-yellow-400', 'text-xs', 'mt-2', 'animate-pulse')}>
                Uploading…
              </p>
            )}
          </div>

          {/* ---------------- Buttons ---------------- */}
          <div className={cn('text-center', 'mt-6', 'flex', 'justify-center', 'gap-4')}>
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
