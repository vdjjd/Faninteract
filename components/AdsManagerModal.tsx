'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

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
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) {
        console.error(uploadError);
        continue;
      }
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
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
      className={cn('fixed', 'inset-0', 'z-[9999]', 'bg-black/70', 'backdrop-blur-md', 'flex', 'items-center', 'justify-center')}
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
          'relative w-full max-w-[960px] max-h-[90vh] rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0b0f1a]/90 to-[#111827]/90 text-white shadow-[0_0_30px_rgba(0,180,255,0.25)] p-6 flex flex-col overflow-hidden'
        )}
      >
        {/* ❌ Close Button */}
        <button
          onClick={onClose}
          className={cn('absolute', 'top-3', 'right-3', 'text-white/80', 'hover:text-white', 'transition')}
        >
          ✕
        </button>

        {/* 🔹 Header */}
        <div className={cn('text-center', 'mb-4', 'border-b', 'border-white/10', 'pb-3')}>
          <h1 className={cn('text-2xl', 'font-bold', 'bg-gradient-to-r', 'from-blue-400', 'to-cyan-400', 'bg-clip-text', 'text-transparent')}>
            Ad Injector Manager
          </h1>
          <p className={cn('text-xs', 'text-blue-300/70', 'mt-1')}>
            Images: 1920×1080 • MP4: 8–15s • Max 10 images / 2 videos
          </p>
        </div>

        {/* ⚙️ Control Bar */}
        <div className={cn('flex', 'items-center', 'justify-between', 'bg-white/5', 'rounded-lg', 'px-4', 'py-3', 'mb-4', 'border', 'border-white/10', 'shadow-inner')}>
          <div className={cn('flex', 'items-center', 'gap-3')}>
            <span className={cn('text-sm', 'text-white/80', 'font-medium')}>Ad Injector:</span>
            <div
              onClick={async () => {
                const enabled = !injectorEnabled;
                setInjectorEnabled(enabled);
                await saveHostSettings(enabled, triggerInterval);
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
              className={cn(
                'relative w-14 h-7 rounded-full cursor-pointer transition-all',
                injectorEnabled ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_12px_rgba(0,255,128,0.5)]' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-all',
                  injectorEnabled ? 'translate-x-7' : ''
                )}
              />
            </div>
          </div>

          <div className={cn('flex', 'items-center', 'gap-2')}>
            <span className={cn('text-sm', 'text-white/80', 'font-medium', 'flex', 'items-center', 'gap-1')}>
              Post Rotation <Info size={14} className="text-blue-400/70" />
            </span>
            <select
              className={cn('bg-black/60', 'border', 'border-blue-500/30', 'text-white', 'text-xs', 'rounded', 'px-2', 'py-1')}
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

        {/* 🧭 Upload Dropzone */}
        <label
          className={cn(
            'border border-dashed border-blue-500/40 rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-400/5 hover:from-blue-500/10 hover:to-cyan-400/10',
            'cursor-pointer flex flex-col items-center justify-center p-6 mb-3 transition-all duration-300'
          )}
        >
          <p className={cn('text-sm', 'font-medium', 'text-blue-100/80')}>Drag & Drop files here</p>
          <span className={cn('text-xs', 'text-blue-300/60')}>(or click to upload)</span>
          <input type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
        </label>

        {/* 🧩 Grid */}
        <div className={cn('flex-1', 'border', 'border-white/10', 'bg-white/5', 'p-3', 'rounded-lg', 'overflow-auto')}>
          {loading ? (
            <p className={cn('text-center', 'opacity-60', 'mt-8')}>Loading ads...</p>
          ) : ads.length === 0 ? (
            <p className={cn('text-center', 'opacity-60', 'mt-8')}>No ads yet</p>
          ) : (
            <div className={cn('grid', 'grid-cols-4', 'gap-3')}>
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className={cn('relative', 'group', 'rounded-lg', 'bg-white/10', 'overflow-hidden', 'border', 'border-white/10', 'hover:scale-[1.03]', 'hover:shadow-[0_0_20px_rgba(0,150,255,0.3)]', 'transition-all')}
                >
                  {ad.type === 'image' ? (
                    <Image
                      src={ad.url}
                      alt="ad"
                      width={300}
                      height={200}
                      className={cn('h-32', 'w-full', 'object-cover')}
                    />
                  ) : (
                    <video src={ad.url} muted className={cn('h-32', 'w-full', 'object-cover')} />
                  )}

                  {/* Badges */}
                  <span className={cn('absolute', 'top-1', 'left-1', 'bg-blue-500/80', 'text-white', 'text-[10px]', 'px-2', 'py-[1px]', 'rounded-full', 'shadow')}>
                    {ad.type === 'image' ? 'Image' : 'Video'}
                  </span>
                  <span className={cn('absolute', 'bottom-1', 'right-1', 'bg-black/60', 'text-blue-300', 'text-[10px]', 'px-2', 'py-[1px]', 'rounded-full')}>
                    {ad.duration_seconds}s
                  </span>

                  {/* Delete */}
                  <button
                    onClick={async () => {
                      const bucket = ad.type === 'image' ? 'ads-images' : 'ads-videos';
                      await supabase.storage.from(bucket).remove([ad.storage_path]);
                      await supabase.from('ads').delete().eq('id', ad.id);
                      loadAds();
                    }}
                    className={cn('absolute', 'top-1', 'right-1', 'bg-red-600', 'hover:bg-red-700', 'text-[11px]', 'px-2', 'py-[1px]', 'rounded', 'opacity-0', 'group-hover:opacity-100', 'transition')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div className={cn('absolute', 'bottom-4', 'left-4', 'bg-blue-500/20', 'text-blue-200', 'text-sm', 'px-3', 'py-1', 'rounded-lg', 'shadow', 'animate-pulse')}>
              Uploading...
            </div>
          )}
        </div>

        {/* 🧾 Footer */}
        <p className={cn('text-center', 'text-xs', 'text-blue-300/50', 'mt-3')}>
          💡 Tip: Videos auto-limit to 15s. Reorder coming soon.
        </p>
      </div>
    </div>
  );
}
