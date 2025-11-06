'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AdsManagerModalProps {
  host: any;
  onClose: () => void;
}

export default function AdsManagerModal({ host, onClose }: AdsManagerModalProps) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [triggerInterval, setTriggerInterval] = useState(8);
  const [injectorEnabled, setInjectorEnabled] = useState(true);
  const dragIndex = useRef<number | null>(null);

  const maxImages = 10;
  const maxVideos = 2;

  /* -------------------------- LOAD SETTINGS + ADS -------------------------- */
  useEffect(() => {
    loadHostSettings();
    loadAds();
  }, [host?.id]);

  async function loadHostSettings() {
    if (!host?.id) return;
    const { data, error } = await supabase
      .from('hosts')
      .select('injector_enabled, trigger_interval')
      .eq('id', host.id)
      .single();

    if (error) console.error('Error loading host settings:', error);
    if (data) {
      setInjectorEnabled(data.injector_enabled ?? true);
      setTriggerInterval(data.trigger_interval ?? 8);
    }
  }

  async function saveHostSettings(enabled: boolean, interval: number) {
    if (!host?.id) return;
    const { error } = await supabase
      .from('hosts')
      .update({ injector_enabled: enabled, trigger_interval: interval })
      .eq('id', host.id);

    if (error) console.error('Error saving host settings:', error);
  }

  async function loadAds() {
    if (!host?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('host_profile_id', host.id)
      .order('order_index', { ascending: true });

    if (error) console.error('Error loading ads:', error);
    setAds(data || []);
    setLoading(false);
  }

  /* ------------------------------ FILE UPLOAD ------------------------------ */
  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const type = file.type.startsWith('video/') ? 'video' : 'image';

      // ⏱️ Limit video duration
      if (type === 'video') {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        await new Promise((res) => (video.onloadedmetadata = res));
        if (video.duration > 15) {
          alert(`❌ ${file.name} exceeds 15 seconds and was skipped.`);
          continue;
        }
      }

      const bucket = type === 'image' ? 'ads-images' : 'ads-videos';
      const filePath = `${host.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const publicUrl =
        supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;

      await supabase.from('ads').insert({
        host_profile_id: host.id,
        type,
        url: publicUrl,
        storage_path: filePath,
        order_index: ads.length,
        duration_seconds: type === 'image' ? 8 : 15,
        active: true,
      });
    }

    await loadAds();
    setUploading(false);
  };

  /* ------------------------------- RENDER UI ------------------------------- */
  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center'
      )}
      onClick={onClose}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        uploadFiles(e.dataTransfer.files);
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-black text-white w-full max-w-[900px] max-h-[90vh]',
          'p-4 flex flex-col gap-3 relative rounded-xl border border-white/20 shadow-2xl overflow-hidden'
        )}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded'
          )}
        >
          ✕
        </button>

        {/* Header */}
        <div className={cn('text-center mt-2 mb-2')}>
          <h1 className={cn('text-xl', 'font-bold')}>Ad Injector Manager</h1>
          <p className={cn('text-red-400', 'text-xs', 'mt-1')}>
            Images 1920×1080 • MP4 ≤ 15s (min 8s)
          </p>
        </div>

        {/* Toggle + Rotation */}
        <div className={cn('flex', 'items-center', 'justify-center', 'gap-6', 'mb-2')}>
          {/* Toggle */}
          <div className={cn('flex', 'items-center', 'gap-2')}>
            <span className={cn('text-sm', 'opacity-70')}>Injector:</span>
            <label className={cn('relative', 'inline-flex', 'items-center', 'cursor-pointer')}>
              <input
                type="checkbox"
                className={cn('sr-only', 'peer')}
                checked={injectorEnabled}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  setInjectorEnabled(enabled);
                  await saveHostSettings(enabled, triggerInterval);

                  // ✅ Broadcast toggle change to all connected walls
                  try {
                    await supabase.channel('fan_wall_broadcast').send({
                      type: 'broadcast',
                      event: 'injector_toggled',
                      payload: { host_id: host.id, enabled },
                    });
                  } catch (err) {
                    console.error('Broadcast failed:', err);
                  }
                }}
              />
              <div
                className={cn(
                  'w-12 h-6 rounded-full bg-gray-600 peer-checked:bg-green-500 transition-all'
                )}
              ></div>
              <span
                className={cn(
                  'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all',
                  injectorEnabled ? 'translate-x-6' : 'translate-x-0'
                )}
              />
            </label>
          </div>

          {/* Rotation Count */}
          <div className={cn('flex', 'items-center', 'gap-2')}>
            <span className={cn('text-sm', 'opacity-70')}>Post Rotation Count:</span>
            <select
              className={cn('bg-gray-800', 'text-xs', 'rounded', 'px-2', 'py-1', 'border', 'border-gray-600')}
              value={triggerInterval}
              onChange={(e) => {
                const newVal = Number(e.target.value);
                setTriggerInterval(newVal);
                saveHostSettings(injectorEnabled, newVal);
              }}
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
        </div>

        <p className={cn('text-xs', 'text-center', 'opacity-60', 'mb-1')}>
          Show an ad overlay after this many guest post rotations.
        </p>

        {/* Upload */}
        <label
          className={cn(
            'border border-dashed border-gray-500 rounded-lg bg-white/5 hover:bg-white/10',
            'cursor-pointer flex flex-col items-center justify-center p-4 text-sm'
          )}
        >
          Drag & Drop files here
          <span className={cn('text-xs', 'opacity-40')}>(or click to upload)</span>
          <input
            type="file"
            multiple
            hidden
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </label>

        {/* Grid */}
        <div className={cn('flex-1', 'border', 'border-gray-600', 'bg-white/5', 'p-3', 'rounded-lg', 'overflow-auto')}>
          {loading ? (
            <p className={cn('text-center', 'opacity-60', 'mt-8')}>Loading...</p>
          ) : ads.length === 0 ? (
            <p className={cn('text-center', 'opacity-60', 'mt-8')}>No ads yet</p>
          ) : (
            <div className={cn('grid', 'grid-cols-4', 'gap-3')}>
              {ads.map((ad, i) => (
                <div
                  key={ad.id}
                  className={cn('relative', 'rounded-lg', 'bg-white/10', 'p-1', 'group')}
                >
                  {ad.type === 'image' ? (
                    <Image
                      src={ad.url}
                      alt="ad"
                      width={300}
                      height={200}
                      className={cn('h-32', 'w-full', 'object-cover', 'rounded')}
                    />
                  ) : (
                    <video
                      src={ad.url}
                      muted
                      className={cn('h-32', 'w-full', 'object-cover', 'rounded')}
                    />
                  )}
                  <button
                    onClick={async () => {
                      const bucket =
                        ad.type === 'image' ? 'ads-images' : 'ads-videos';
                      await supabase.storage
                        .from(bucket)
                        .remove([ad.storage_path]);
                      await supabase.from('ads').delete().eq('id', ad.id);
                      loadAds();
                    }}
                    className={cn('absolute', 'top-2', 'right-2', 'bg-red-600', 'text-xs', 'px-2', 'py-1', 'rounded', 'opacity-0', 'group-hover:opacity-100', 'transition')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div className={cn('fixed', 'bottom-2', 'left-2', 'bg-white/30', 'text-sm', 'p-2', 'rounded')}>
              Uploading…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
