'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { cn } from '../lib/utils';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

interface OptionsModalFanWallProps {
  wall: any;
  hostId: string;
  onClose: () => void;
  refreshFanWalls: () => Promise<void>;
}

export default function OptionsModalFanWall({
  wall,
  hostId,
  onClose,
  refreshFanWalls,
}: OptionsModalFanWallProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localWall, setLocalWall] = useState<any>(() => {
    let normalizedLayout = wall.layout_type;
    if (wall.layout_type === '2x2 Grid') normalizedLayout = '2 Column × 2 Row';
    if (wall.layout_type === '4x2 Grid') normalizedLayout = '4 Column × 2 Row';
    return { ...wall, layout_type: normalizedLayout };
  });

  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);
  const broadcastRef = useRef<any>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  if (!broadcastRef.current) {
    broadcastRef.current = supabase.channel('global-fan-walls', {
      config: { broadcast: { self: true, ack: true } },
    });
  }

  function debouncedBroadcast(event: string, payload: any) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        await broadcastRef.current.send({ type: 'broadcast', event, payload });
        console.log(`📡 Broadcast sent [${event}]`, payload);
      } catch (err) {
        console.error(`❌ Broadcast error [${event}]`, err);
      }
    }, 300);
  }

  async function handleSave() {
    try {
      setSaving(true);

      const countdownValue =
        !localWall.countdown || localWall.countdown === 'none' ? 'none' : String(localWall.countdown);

      let layoutKey = 'Single Highlight Post';
      if (localWall.layout_type?.includes('2 Column')) layoutKey = '2x2 Grid';
      if (localWall.layout_type?.includes('4 Column')) layoutKey = '4x2 Grid';

      const updates = {
        title: localWall.title || '',
        host_title: localWall.host_title || '',
        countdown: countdownValue,
        countdown_active: countdownValue !== 'none' ? false : null,
        layout_type: layoutKey,
        post_transition: localWall.post_transition || '',
        transition_speed: localWall.transition_speed || 'Medium',
        auto_delete_minutes: localWall.auto_delete_minutes ?? 0,
        updated_at: new Date().toISOString(),
      };

      await Promise.all([
        supabase.from('fan_walls').update(updates).eq('id', localWall.id),
        debouncedBroadcast('wall_updated', { id: localWall.id, ...updates }),
      ]);

      setLocalWall((prev: any) => ({ ...prev, ...updates }));
      refreshFanWalls?.();
    } catch (err) {
      console.error('❌ Error saving wall settings:', err);
    } finally {
      setSaving(false);
      onClose();
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

      const compressedFile = new File([compressed], file.name, { type: file.type });
      const ext = file.type.split('/')[1];
      const filePath = `host_${hostId}/wall_${localWall.id}/background-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressedFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('wall-backgrounds').getPublicUrl(filePath);

      await Promise.all([
        supabase
          .from('fan_walls')
          .update({
            background_type: 'image',
            background_value: publicUrl.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', localWall.id),
        debouncedBroadcast('wall_updated', {
          id: localWall.id,
          background_type: 'image',
          background_value: publicUrl.publicUrl,
        }),
      ]);

      setLocalWall({
        ...localWall,
        background_type: 'image',
        background_value: publicUrl.publicUrl,
      });

      refreshFanWalls?.();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Check console for details.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteOldImageIfExists() {
    try {
      if (localWall.background_type !== 'image' || !localWall.background_value) return;
      const parts = localWall.background_value.split('/wall-backgrounds/');
      if (parts.length < 2) return;
      const filePath = parts[1];
      await supabase.storage.from('wall-backgrounds').remove([filePath]);
    } catch {}
  }

  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    if (localWall.background_type === 'image') {
      setPendingChange({ type, value });
      setShowWarning(true);
      return;
    }

    setLocalWall({ ...localWall, background_type: type, background_value: value });

    await Promise.all([
      supabase
        .from('fan_walls')
        .update({
          background_type: type,
          background_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localWall.id),
      debouncedBroadcast('wall_updated', { id: localWall.id, background_type: type, background_value: value }),
    ]);

    refreshFanWalls?.();
  }

  async function confirmChange() {
    if (!pendingChange) return;
    await deleteOldImageIfExists();

    setLocalWall({
      ...localWall,
      background_type: pendingChange.type,
      background_value: pendingChange.value,
    });

    await Promise.all([
      supabase
        .from('fan_walls')
        .update({
          background_type: pendingChange.type,
          background_value: pendingChange.value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localWall.id),
      debouncedBroadcast('wall_updated', {
        id: localWall.id,
        background_type: pendingChange.type,
        background_value: pendingChange.value,
      }),
    ]);

    setShowWarning(false);
    setPendingChange(null);
    refreshFanWalls?.();
  }

  function cancelChange() {
    setShowWarning(false);
    setPendingChange(null);
  }

  return (
    <>
      {showWarning && (
        <div className={cn('fixed', 'inset-0', 'bg-black/80', 'flex', 'items-center', 'justify-center', 'z-[60]')}>
          <div className={cn('bg-gray-900', 'border', 'border-yellow-500', 'p-6', 'rounded-2xl', 'shadow-2xl', 'text-white', 'w-[90%]', 'max-w-sm', 'text-center')}>
            <h2 className={cn('text-lg', 'font-bold', 'text-yellow-400', 'mb-3')}>Warning</h2>
            <p className={cn('text-sm', 'mb-5')}>
              Changing to a color or gradient will delete your current background image.
            </p>
            <div className={cn('flex', 'justify-center', 'gap-4')}>
              <button onClick={confirmChange} className={cn('bg-green-600', 'hover:bg-green-700', 'px-4', 'py-2', 'rounded', 'font-semibold')}>
                Continue
              </button>
              <button onClick={cancelChange} className={cn('bg-red-600', 'hover:bg-red-700', 'px-4', 'py-2', 'rounded', 'font-semibold')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn('fixed', 'inset-0', 'bg-black/80', 'flex', 'items-center', 'justify-center', 'z-50', 'backdrop-blur-md')}>
        <div
          className={cn('border', 'border-blue-400', 'p-6', 'rounded-2xl', 'shadow-2xl', 'w-96', 'text-white', 'animate-fadeIn', 'overflow-y-auto', 'max-h-[90vh]')}
          style={{
            background:
              localWall.background_type === 'image'
                ? `url(${localWall.background_value}) center/cover no-repeat`
                : localWall.background_value || DEFAULT_GRADIENT,
            backdropFilter: 'blur(8px)',
            backgroundBlendMode: 'overlay',
          }}
        >
          <h3 className={cn('text-center', 'text-xl', 'font-bold', 'mb-3')}>⚙ Edit Fan Zone Wall</h3>

          <label className={cn('block', 'mt-3', 'text-sm')}>Title (Private):</label>
          <input
            type="text"
            value={localWall.host_title || ''}
            onChange={(e) => setLocalWall({ ...localWall, host_title: e.target.value })}
            className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
          />

          <label className={cn('block', 'mt-3', 'text-sm')}>Public Title:</label>
          <input
            type="text"
            value={localWall.title || ''}
            onChange={(e) => setLocalWall({ ...localWall, title: e.target.value })}
            className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
          />

          <label className={cn('block', 'mt-3', 'text-sm')}>Countdown:</label>
          <select
            className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            value={localWall.countdown || 'none'}
            onChange={(e) => setLocalWall({ ...localWall, countdown: e.target.value })}
          >
            <option value="none">No Countdown / Start Immediately</option>
            {['30 Seconds', '1 Minute', '2 Minutes', '3 Minutes', '4 Minutes', '5 Minutes', '10 Minutes', '15 Minutes', '20 Minutes', '25 Minutes', '30 Minutes', '45 Minutes', '60 Minutes'].map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <label className={cn('block', 'mt-3', 'text-sm')}>Layout Type:</label>
          <select
            className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            value={localWall.layout_type || 'Single Highlight Post'}
            onChange={(e) => setLocalWall({ ...localWall, layout_type: e.target.value })}
          >
            <option>Single Highlight Post</option>
            <option>2 Column × 2 Row</option>
            <option>4 Column × 2 Row</option>
          </select>

          <label className={cn('block', 'mt-3', 'text-sm')}>Post Transition:</label>
          <select
            className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1', 'disabled:bg-gray-300', 'disabled:cursor-not-allowed')}
            value={localWall.post_transition || 'Fade In / Fade Out'}
            onChange={(e) => setLocalWall({ ...localWall, post_transition: e.target.value })}
            disabled={
              localWall.layout_type === '2 Column × 2 Row' ||
              localWall.layout_type === '4 Column × 2 Row'
            }
          >
            <option>Fade In / Fade Out</option>
            <option>Slide Up / Slide Out</option>
            <option>Slide Down / Slide Out</option>
            <option>Slide Left / Slide Right</option>
            <option>Zoom In / Zoom Out</option>
            <option>Flip</option>
            <option>Rotate In / Rotate Out</option>
          </select>

          {(localWall.layout_type === '2 Column × 2 Row' ||
            localWall.layout_type === '4 Column × 2 Row') && (
            <p className={cn('text-xs', 'text-yellow-400', 'mt-1')}>Transition is fixed for multi-grid layouts.</p>
          )}

          <label className={cn('block', 'mt-3', 'text-sm')}>Transition Speed:</label>
          <select
            className={cn('w-full', 'p-2', 'rounded-md', 'text-black', 'mt-1')}
            value={localWall.transition_speed || 'Medium'}
            onChange={(e) => setLocalWall({ ...localWall, transition_speed: e.target.value })}
          >
            <option>Slow</option>
            <option>Medium</option>
            <option>Fast</option>
          </select>

          <label className={cn('block', 'mt-3', 'text-sm')}>Auto Delete Posts After:</label>
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

          <div className="mt-6">
            <p className={cn('text-sm', 'font-semibold', 'mb-2', 'text-center')}>Choose Background Gradient</p>

            <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mb-3')}>
              {[
                'linear-gradient(135deg,#0d47a1,#1976d2)',
                'linear-gradient(135deg,#1b2735,#090a0f)',
                'linear-gradient(135deg,#2b3a55,#4a6fa5)',
                'linear-gradient(135deg,#003366,#66ccff)',
                'linear-gradient(135deg,#13294b,#3b83bd)',
                'linear-gradient(135deg,#1e3c72,#2a5298)',
                'linear-gradient(135deg,#142850,#27496d)',
                'linear-gradient(135deg,#1c2541,#3a506b)',
              ].map((grad, i) => (
                <button
                  key={`grad1-${i}`}
                  onClick={() => handleBackgroundChange('gradient', grad)}
                  className={cn('w-8', 'h-8', 'rounded-full', 'border', 'border-white/50', 'hover:scale-110', 'transition-all')}
                  style={{ background: grad }}
                />
              ))}
            </div>

            <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mb-3')}>
              {[
                'linear-gradient(135deg,#002244,#C60C30)',
                'linear-gradient(135deg,#101820,#D7A22A)',
                'linear-gradient(135deg,#AA0000,#B3995D)',
                'linear-gradient(135deg,#0B162A,#C83803)',
                'linear-gradient(135deg,#002244,#69BE28)',
                'linear-gradient(135deg,#E31837,#002B5C)',
                'linear-gradient(135deg,#5A1414,#FFD700)',
                'linear-gradient(135deg,#0033A0,#FFB81C)',
              ].map((grad, i) => (
                <button
                  key={`grad2-${i}`}
                  onClick={() => handleBackgroundChange('gradient', grad)}
                  className={cn('w-8', 'h-8', 'rounded-full', 'border', 'border-white/50', 'hover:scale-110', 'transition-all')}
                  style={{ background: grad }}
                />
              ))}
            </div>

            <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2', 'mb-3')}>
              {[
                'linear-gradient(135deg,#00F260,#0575E6)',
                'linear-gradient(135deg,#FC466B,#3F5EFB)',
                'linear-gradient(135deg,#11998E,#38EF7D)',
                'linear-gradient(135deg,#FF512F,#DD2476)',
                'linear-gradient(135deg,#F7971E,#FFD200)',
                'linear-gradient(135deg,#00C9FF,#92FE9D)',
                'linear-gradient(135deg,#8E2DE2,#4A00E0)',
                'linear-gradient(135deg,#f12711,#f5af19)',
              ].map((grad, i) => (
                <button
                  key={`grad3-${i}`}
                  onClick={() => handleBackgroundChange('gradient', grad)}
                  className={cn('w-8', 'h-8', 'rounded-full', 'border', 'border-white/50', 'hover:scale-110', 'transition-all')}
                  style={{ background: grad }}
                />
              ))}
            </div>

            <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-2')}>
              {[
                'linear-gradient(135deg,#434343,#000000)',
                'linear-gradient(135deg,#D3CCE3,#E9E4F0)',
                'linear-gradient(135deg,#3a7bd5,#3a6073)',
                'linear-gradient(135deg,#232526,#414345)',
                'linear-gradient(135deg,#BA8B02,#181818)',
                'linear-gradient(135deg,#0F2027,#203A43,#2C5364)',
                'linear-gradient(135deg,#556270,#FF6B6B)',
                'linear-gradient(135deg,#485563,#29323c)',
              ].map((grad, i) => (
                <button
                  key={`grad4-${i}`}
                  onClick={() => handleBackgroundChange('gradient', grad)}
                  className={cn('w-8', 'h-8', 'rounded-full', 'border', 'border-white/50', 'hover:scale-110', 'transition-all')}
                  style={{ background: grad }}
                />
              ))}
            </div>
          </div>

          <div className={cn('mt-6', 'text-center')}>
  <p className={cn('text-sm', 'font-semibold', 'mb-2')}>Upload Custom Background</p>
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleImageUpload}
  />
  {uploading && (
    <p className={cn('text-yellow-400', 'text-xs', 'mt-2', 'animate-pulse')}>
      Uploading…
    </p>
  )}
</div>

          <div className={cn('text-center', 'mt-5', 'flex', 'justify-center', 'gap-4')}>
            <button
              disabled={saving}
              onClick={handleSave}
              className={`${saving ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 rounded font-semibold`}
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
    </>
  );
}