'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

/* -------------------------------------------------------- */
/* ✅ TYPES */
/* -------------------------------------------------------- */

interface AdsManagerModalProps {
  host: any;
  onClose: () => void;
}

interface AdItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  order_index: number;
  duration_seconds: number;
  storage_path: string;
}

/* -------------------------------------------------------- */
/* ✅ COMPONENT */
/* -------------------------------------------------------- */

export default function AdsManagerModal({ host, onClose }: AdsManagerModalProps) {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [triggerInterval, setTriggerInterval] = useState(8);
  const [injectorEnabled, setInjectorEnabled] = useState(true);

  const [reorderMode, setReorderMode] = useState(false);

  const dragIndex = useRef<number | null>(null);

  /* -------------------------------------------------------- */
  /* ✅ LOAD SETTINGS + ADS */
  /* -------------------------------------------------------- */

  useEffect(() => {
    loadHostSettings();
    loadAds();
  }, [host?.id]);

  async function loadHostSettings() {
    if (!host?.id) return;
    const { data } = await supabase
      .from('hosts')
      .select('injector_enabled, trigger_interval')
      .eq('id', host.id)
      .single();

    if (data) {
      setInjectorEnabled(data.injector_enabled ?? true);
      setTriggerInterval(data.trigger_interval ?? 8);
    }
  }

  async function saveHostSettings(enabled: boolean, interval: number) {
    if (!host?.id) return;
    await supabase
      .from('hosts')
      .update({ injector_enabled: enabled, trigger_interval: interval })
      .eq('id', host.id);
  }

  async function loadAds() {
    if (!host?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('host_profile_id', host.id)
      .order('order_index', { ascending: true });

    setAds((data as any[]) || []);
    setLoading(false);
  }

  /* -------------------------------------------------------- */
  /* ✅ FILE UPLOAD */
  /* -------------------------------------------------------- */

  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const type = file.type.startsWith('video/') ? 'video' : 'image';

      if (type === 'video') {
        const v = document.createElement('video');
        v.src = URL.createObjectURL(file);
        await new Promise((res) => (v.onloadedmetadata = res));
        if (v.duration > 15) {
          alert(`${file.name} is longer than 15 seconds.`);
          continue;
        }
      }

      const bucket = type === 'image' ? 'ads-images' : 'ads-videos';
      const path = `${host.id}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) continue;

      const publicUrl =
        supabase.storage.from(bucket)
          .getPublicUrl(path).data.publicUrl;

      await supabase.from('ads').insert({
        host_profile_id: host.id,
        type,
        url: publicUrl,
        storage_path: path,
        order_index: ads.length,
        duration_seconds: type === 'image' ? 8 : 15,
        active: true
      });
    }

    await loadAds();
    setUploading(false);
  };

  /* -------------------------------------------------------- */
  /* ✅ REORDER HANDLERS */
  /* -------------------------------------------------------- */

  function onDragStart(i: number) {
    dragIndex.current = i;
  }

  function onDragEnter(i: number) {
    const from = dragIndex.current;
    if (from === null || from === i) return;

    const updated = [...ads];
    const moved = updated.splice(from, 1)[0];
    updated.splice(i, 0, moved);

    dragIndex.current = i;
    setAds(updated);
  }

  async function saveOrder() {
    for (let i = 0; i < ads.length; i++) {
      await supabase
        .from('ads')
        .update({ order_index: i })
        .eq('id', ads[i].id);
    }
    await loadAds();
    setReorderMode(false);
  }

  /* -------------------------------------------------------- */
  /* ✅ UI */
  /* -------------------------------------------------------- */

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/70 backdrop-blur-md z-[9999]',
        'flex items-center justify-center',
        'animate-fadeIn'
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
          'relative w-full max-w-[960px] max-h-[90vh]',
          'rounded-2xl border border-blue-500/30',
          'bg-gradient-to-br from-[#0b0f1a]/95 to-[#111827]/95',
          'shadow-[0_0_40px_rgba(0,140,255,0.45)]',
          'p-6 flex flex-col overflow-hidden',
          'animate-zoomIn'
        )}
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className={cn('absolute', 'top-3', 'right-3', 'text-white/80', 'hover:text-white', 'text-xl')}
        >
          ✕
        </button>

        {/* HEADER */}
        <div className={cn('text-center', 'mb-4', 'border-b', 'border-white/10', 'pb-3')}>
          <h1 className={cn('text-2xl', 'font-bold', 'bg-gradient-to-r', 'from-blue-400', 'to-cyan-400', 'bg-clip-text', 'text-transparent')}>
            Ad Injector Manager
          </h1>
          <p className={cn('text-xs', 'text-blue-300/70', 'mt-1')}>
            Images: 1920×1080 • Videos: 8–15s • Max 10 images / 2 videos
          </p>
        </div>

        {/* CONTROL BAR */}
        <div className={cn('flex', 'items-center', 'justify-between', 'bg-white/5', 'rounded-lg', 'px-4', 'py-3', 'mb-4', 'border', 'border-white/10')}>
          {/* toggle */}
          <div className={cn('flex', 'items-center', 'gap-3')}>
            <span className={cn('text-sm', 'text-white/80', 'font-medium')}>Ad Injector:</span>
            <div
              onClick={async () => {
                const enabled = !injectorEnabled;
                setInjectorEnabled(enabled);
                await saveHostSettings(enabled, triggerInterval);
              }}
              className={cn(
                'relative w-14 h-7 rounded-full cursor-pointer transition-all',
                injectorEnabled
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_12px_rgba(0,255,128,0.5)]'
                  : 'bg-gray-600'
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

          {/* rotation */}
          <div className={cn('flex', 'items-center', 'gap-2')}>
            <span className={cn('text-sm', 'text-white/80', 'font-medium', 'flex', 'items-center', 'gap-1')}>
              Post Rotation <Info size={14} className="text-blue-400/70" />
            </span>
            <select
              className={cn('bg-black/60', 'border', 'border-blue-500/30', 'text-white', 'text-xs', 'rounded', 'px-2', 'py-1')}
              value={triggerInterval}
              onChange={(e) => {
                const n = Number(e.target.value);
                setTriggerInterval(n);
                saveHostSettings(injectorEnabled, n);
              }}
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
        </div>

        {/* UPLOAD DROPZONE */}
        <label className={cn(
          'border border-dashed border-blue-500/40 rounded-lg',
          'bg-gradient-to-br from-blue-500/5 to-cyan-400/5',
          'hover:from-blue-500/10 hover:to-cyan-400/10 transition-all',
          'cursor-pointer flex flex-col items-center justify-center p-6 mb-3'
        )}>
          <p className={cn('text-sm', 'font-medium', 'text-blue-100/80')}>Drag & Drop files here</p>
          <span className={cn('text-xs', 'text-blue-300/60')}>(or click to upload)</span>
          <input type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
        </label>

        {/* GRID */}
        <div className={cn('flex-1', 'border', 'border-white/10', 'bg-white/5', 'p-3', 'rounded-lg', 'overflow-auto')}>
          {loading ? (
            <p className={cn('text-center', 'opacity-60', 'mt-8')}>Loading ads...</p>
          ) : ads.length === 0 ? (
            <p className={cn('text-center', 'opacity-60', 'mt-8')}>No ads yet</p>
          ) : (
            <div className={cn('grid', 'grid-cols-4', 'gap-3')}>
              {ads.map((ad, i) => (
                <div
                  key={ad.id}
                  draggable={reorderMode}
                  onDragStart={() => onDragStart(i)}
                  onDragEnter={() => onDragEnter(i)}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border border-white/10',
                    'bg-white/10 hover:shadow-[0_0_20px_rgba(0,150,255,0.3)] transition-all',
                    reorderMode ? 'cursor-move ring-2 ring-blue-400/50' : ''
                  )}
                >
                  {ad.type === 'image' ? (
                    <Image src={ad.url} alt="ad" width={300} height={200} className={cn('h-32', 'w-full', 'object-cover')} />
                  ) : (
                    <video src={ad.url} muted className={cn('h-32', 'w-full', 'object-cover')} />
                  )}

                  {/* badges */}
                  <span className={cn('absolute', 'top-1', 'left-1', 'bg-blue-500/80', 'text-white', 'text-[10px]', 'px-2', 'py-[1px]', 'rounded-full', 'shadow')}>
                    {ad.type === 'image' ? 'Image' : 'Video'}
                  </span>
                  <span className={cn('absolute', 'bottom-1', 'right-1', 'bg-black/60', 'text-blue-300', 'text-[10px]', 'px-2', 'py-[1px]', 'rounded-full')}>
                    {ad.duration_seconds}s
                  </span>

                  {/* delete */}
                  {!reorderMode && (
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className={cn('mt-3', 'flex', 'justify-between', 'items-center')}>
          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={cn('text-sm', 'px-4', 'py-2', 'rounded-lg', 'bg-blue-600/40', 'hover:bg-blue-600/60', 'border', 'border-blue-400/30')}
          >
            {reorderMode ? 'Cancel Reorder' : 'Reorder Ads'}
          </button>

          {reorderMode && (
            <button
              onClick={saveOrder}
              className={cn('text-sm', 'px-4', 'py-2', 'rounded-lg', 'bg-green-600/60', 'hover:bg-green-600/80', 'border', 'border-green-400/40', 'shadow-[0_0_12px_rgba(0,255,140,0.4)]')}
            >
              ✅ Save Order
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------- */
/* ✅ ANIMATIONS (Tailwind plugins not required) */
/* -------------------------------------------------------- */


