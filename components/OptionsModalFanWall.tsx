'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { cn } from '../lib/utils';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

export default function OptionsModalFanWall({
  wall,
  hostId,
  onClose,
  refreshFanWalls,
}) {
  const channelRef = useRealtimeChannel();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [localWall, setLocalWall] = useState<any>(() => ({
    ...wall,
    color_start: wall.color_start || '#0d47a1',
    color_end: wall.color_end || '#1976d2',
  }));

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  function broadcast(event: string, payload: any) {
    const channel = channelRef?.current;
    if (!channel) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        await channel.send({ type: 'broadcast', event, payload });
      } catch (err) {
        console.error(`❌ Broadcast error [${event}]`, err);
      }
    }, 200);
  }

  /* SAVE */
  async function handleSave() {
    try {
      setSaving(true);

      const isNoCountdown =
        !localWall.countdown || localWall.countdown === 'none';

      const countdownValue = isNoCountdown ? null : String(localWall.countdown);

      const layoutKey =
        localWall.layout_type?.includes('2 Column')
          ? '2x2 Grid'
          : localWall.layout_type?.includes('4 Column')
          ? '4x2 Grid'
          : 'Single Highlight Post';

      const postTransition =
        layoutKey === 'Single Highlight Post'
          ? localWall.post_transition || 'Fade In / Fade Out'
          : 'Fade In / Fade Out';

      const updates: Record<string, any> = {
        title: localWall.title?.trim() || null,
        host_title: localWall.host_title?.trim() || null,
        countdown: countdownValue,
        countdown_active: false,
        layout_type: layoutKey,
        post_transition: postTransition,
        transition_speed: localWall.transition_speed || 'Medium',
        auto_delete_minutes: localWall.auto_delete_minutes ?? 0,
        background_type: localWall.background_type,
        background_value: localWall.background_value || DEFAULT_GRADIENT,
        updated_at: new Date().toISOString(),
      };

      for (const key in updates) {
        if (updates[key] === undefined || updates[key] === '') {
          delete updates[key];
        }
      }

      const { error } = await supabase
        .from('fan_walls')
        .update(updates)
        .eq('id', localWall.id);

      if (error) throw error;

      broadcast('wall_updated', {
        id: localWall.id,
        ...updates,
        countdown: countdownValue || 'none',
        countdown_active: false,
      });

      await refreshFanWalls?.();
    } catch (err) {
      console.error('❌ Error saving wall settings:', err);
    } finally {
      setSaving(false);
      onClose();
    }
  }

  /* IMAGE UPLOAD */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Please upload JPG, PNG, or WEBP.');
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      setLocalWall({
        ...localWall,
        background_type: 'image',
        background_value: previewUrl,
      });

      setUploading(true);

      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const ext = file.type.split('/')[1];
      const filePath = `host_${hostId}/wall_${localWall.id}/background-${Date.now()}.${ext}`;

      await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });

      const { data: publicUrl } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(filePath);

      const imageUrl = publicUrl.publicUrl;

      await supabase
        .from('fan_walls')
        .update({
          background_type: 'image',
          background_value: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localWall.id);

      broadcast('wall_updated', {
        id: localWall.id,
        background_type: 'image',
        background_value: imageUrl,
      });

      setLocalWall({
        ...localWall,
        background_type: 'image',
        background_value: imageUrl,
      });

      await refreshFanWalls?.();
    } catch (err) {
      console.error('❌ Upload failed:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  /* BACKGROUND CHANGE (gradient) */
  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    setLocalWall({
      ...localWall,
      background_type: type,
      background_value: value,
    });

    broadcast('wall_updated', {
      id: localWall.id,
      background_type: type,
      background_value: value,
    });

    await supabase
      .from('fan_walls')
      .update({
        background_type: type,
        background_value: value || DEFAULT_GRADIENT,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localWall.id);
  }

  /* MODAL */
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
        {/* X button */}
        <button
          onClick={onClose}
          className={cn('absolute', 'top-3', 'right-3', 'text-white/80', 'hover:text-white', 'text-xl')}
        >
          ✕
        </button>

        <div className={cn('overflow-y-auto', 'max-h-[75vh]', 'pr-1')}>
          <h3 className={cn('text-center', 'text-xl', 'font-bold', 'mb-3')}>
            ⚙ Edit Fan Zone Wall
          </h3>

          {/* -------------- Titles -------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Title (Private):</label>
            <input
              type="text"
              value={localWall.host_title || ''}
              onChange={(e) =>
                setLocalWall({ ...localWall, host_title: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            />
          </div>

          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Public Title:</label>
            <input
              type="text"
              value={localWall.title || ''}
              onChange={(e) =>
                setLocalWall({ ...localWall, title: e.target.value })
              }
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            />
          </div>

          {/* -------------- Countdown -------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Countdown:</label>
            <select
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
              value={localWall.countdown || 'none'}
              onChange={(e) =>
                setLocalWall({ ...localWall, countdown: e.target.value })
              }
            >
              <option value="none">No Countdown / Start Immediately</option>
              {[
                '30 Seconds',
                '1 Minute',
                '2 Minutes',
                '3 Minutes',
                '4 Minutes',
                '5 Minutes',
                '10 Minutes',
                '15 Minutes',
                '20 Minutes',
                '25 Minutes',
                '30 Minutes',
                '45 Minutes',
                '60 Minutes',
              ].map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* -------------- Layout -------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Layout:</label>
            <select
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
              value={localWall.layout_type || 'Single Highlight Post'}
              onChange={(e) =>
                setLocalWall({ ...localWall, layout_type: e.target.value })
              }
            >
              <option>Single Highlight Post</option>
              <option>2 Column × 2 Row</option>
              <option>4 Column × 2 Row</option>
            </select>
          </div>

          {/* -------------- Transition -------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Post Transition:</label>
            <select
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
              value={
                localWall.layout_type === 'Single Highlight Post'
                  ? localWall.post_transition || 'Fade In / Fade Out'
                  : 'Fade In / Fade Out'
              }
              onChange={(e) =>
                setLocalWall({ ...localWall, post_transition: e.target.value })
              }
              disabled={localWall.layout_type !== 'Single Highlight Post'}
              style={{
                opacity:
                  localWall.layout_type !== 'Single Highlight Post' ? 0.5 : 1,
                cursor:
                  localWall.layout_type !== 'Single Highlight Post'
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {[
                'Fade In / Fade Out',
                'Slide Up / Slide Out',
                'Slide Down / Slide Out',
                'Slide Left / Slide Right',
                'Slide Right / Slide Left',
                'Zoom In / Zoom Out',
                'Zoom Out / Zoom In',
                'Flip',
                'Rotate In / Rotate Out',
                'Pop In / Pop Out',
              ].map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* -------------- Speed -------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Transition Speed:</label>
            <select
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
              value={localWall.transition_speed || 'Medium'}
              onChange={(e) =>
                setLocalWall({
                  ...localWall,
                  transition_speed: e.target.value,
                })
              }
            >
              <option>Slow</option>
              <option>Medium</option>
              <option>Fast</option>
            </select>
          </div>

          {/* -------------- Auto Delete -------------- */}
          <div className={cn('w-full', 'max-w-[520px]', 'mx-auto')}>
            <label className={cn('block', 'mt-3', 'text-sm')}>Auto Delete Posts:</label>
            <select
              className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
              value={localWall.auto_delete_minutes ?? 0}
              onChange={(e) =>
                setLocalWall({
                  ...localWall,
                  auto_delete_minutes: parseInt(e.target.value),
                })
              }
            >
              <option value={0}>Never (Keep All Posts)</option>
              {[5, 10, 15, 20, 30, 45, 60].map((min) => (
                <option key={min} value={min}>
                  {min} Minutes
                </option>
              ))}
            </select>
          </div>

          {/* -------------- Background Preview -------------- */}
          <div className={cn('mt-8', 'flex', 'flex-col', 'items-center')}>
            <div
              className={cn(
                'w-[140px] h-[80px] rounded-md border border-white/20 shadow-inner'
              )}
              style={{
                background: localWall.background_value || DEFAULT_GRADIENT,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            <p className={cn('text-xs', 'text-gray-300', 'mt-2')}>
              {localWall.background_type === 'image'
                ? 'Current Background Image'
                : 'Current Gradient Background'}
            </p>
          </div>

          {/* -------------- Gradient Editor -------------- */}
          <div className={cn('mt-6', 'text-center')}>
            <div className={cn('flex', 'justify-center', 'gap-4', 'mb-3', 'w-full', 'max-w-[520px]', 'mx-auto')}>
              {/* Left */}
              <div>
                <label className={cn('block', 'text-xs', 'mb-1')}>Left Color</label>
                <input
                  type="color"
                  value={localWall.color_start || '#0d47a1'}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const end = localWall.color_end || '#1976d2';

                    const gradient = `
                      linear-gradient(
                        135deg,
                        ${newStart} 0%,
                        ${newStart}80 20%,
                        ${end}60 50%,
                        ${end} 100%
                      )
                    `.replace(/\s+/g, ' ');

                    setLocalWall({
                      ...localWall,
                      color_start: newStart,
                      background_type: 'gradient',
                      background_value: gradient,
                    });

                    handleBackgroundChange('gradient', gradient);
                  }}
                />
              </div>

              {/* Right */}
              <div>
                <label className={cn('block', 'text-xs', 'mb-1')}>Right Color</label>
                <input
                  type="color"
                  value={localWall.color_end || '#1976d2'}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    const start = localWall.color_start || '#0d47a1';

                    const gradient = `
                      linear-gradient(
                        135deg,
                        ${start} 0%,
                        ${start}80 20%,
                        ${newEnd}60 50%,
                        ${newEnd} 100%
                      )
                    `.replace(/\s+/g, ' ');

                    setLocalWall({
                      ...localWall,
                      color_end: newEnd,
                      background_type: 'gradient',
                      background_value: gradient,
                    });

                    handleBackgroundChange('gradient', gradient);
                  }}
                />
              </div>
            </div>
          </div>

          {/* -------------- Upload Image -------------- */}
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

          {/* -------------- Buttons -------------- */}
          <div className={cn('text-center', 'mt-6', 'flex', 'justify-center', 'gap-4')}>
            <button
              disabled={saving}
              onClick={handleSave}
              className={cn(
                saving ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700',
                'px-4 py-2 rounded font-semibold'
              )}
            >
              {saving ? 'Saving…' : '💾 Save'}
            </button>

            <button
              onClick={onClose}
              className={cn('bg-red-600', 'hover:bg-red-700', 'px-4', 'py-2', 'rounded', 'font-semibold')}
            >
              ✖ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
