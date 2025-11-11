"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

/* ------------------------------------------- */
/* TYPES */
/* ------------------------------------------- */

interface AdsManagerModalProps {
  host: any;
  onClose: () => void;
}

interface AdItem {
  id: string;
  url: string;
  type: "image" | "video";
  order_index: number;
  duration_seconds: number;
  storage_path: string;
}

/* ------------------------------------------- */
/* ARRAY MOVE — FIXED VERSION */
/* ------------------------------------------- */
function arrayMove<T>(arr: T[], from: number, to: number) {
  const newArr = [...arr];
  const item = newArr[from];
  newArr.splice(from, 1);
  newArr.splice(to, 0, item);
  return newArr;
}

/* ------------------------------------------- */
/* COMPONENT */
/* ------------------------------------------- */

export default function AdsManagerModal({ host, onClose }: AdsManagerModalProps) {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [triggerInterval, setTriggerInterval] = useState(8);
  const [injectorEnabled, setInjectorEnabled] = useState(true);

  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const dragFrom = useRef<number | null>(null);

  /* ------------------------------------------- */
  /* LOAD HOST SETTINGS + ADS */
  /* ------------------------------------------- */
  useEffect(() => {
    if (!host?.id) return;
    loadHostSettings();
    loadAds();
  }, [host?.id]);

  async function loadHostSettings() {
    const { data } = await supabase
      .from("hosts")
      .select("injector_enabled, trigger_interval")
      .eq("id", host.id)
      .single();

    if (data) {
      setInjectorEnabled(data.injector_enabled ?? true);
      setTriggerInterval(data.trigger_interval ?? 8);
    }
  }

  async function saveHostSettings(enabled: boolean, interval: number) {
    await supabase
      .from("hosts")
      .update({ injector_enabled: enabled, trigger_interval: interval })
      .eq("id", host.id);
  }

  async function loadAds() {
    setLoading(true);

    const { data } = await supabase
      .from("slide_ads")
      .select("*")
      .eq("host_profile_id", host.id)
      .order("order_index", { ascending: true });

    setAds(data || []);
    setLoading(false);
  }

  /* ------------------------------------------- */
  /* UPLOAD (UNCHANGED) */
  /* ------------------------------------------- */

  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      const type = file.type.startsWith("video") ? "video" : "image";
      const bucket = type === "image" ? "ads-images" : "ads-videos";
      const path = `${host.id}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) continue;

      const publicUrl =
        supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

      const nextIndex = ads.length;

      await supabase.from("slide_ads").insert({
        host_profile_id: host.id,
        type,
        url: publicUrl,
        storage_path: path,
        order_index: nextIndex,
        duration_seconds: type === "video" ? 15 : 8,
        active: true,
      });
    }

    loadAds();
  };

  /* ------------------------------------------- */
  /* DND FIX — THIS IS THE ONLY THING CHANGED    */
  /* ------------------------------------------- */

  function handleDragStart(e: React.DragEvent, index: number) {
    if (!reorderMode) return;
    dragFrom.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e: React.DragEvent) {
    if (!reorderMode) return;
    e.preventDefault(); // required for drop to work
  }

  function handleDrop(e: React.DragEvent, index: number) {
    if (!reorderMode || dragFrom.current === null) return;
    e.preventDefault();

    const fromIndex = dragFrom.current;
    const toIndex = index;

    if (fromIndex === toIndex) return;

    const newOrder = arrayMove(ads, fromIndex, toIndex);
    setAds(newOrder);

    dragFrom.current = null;
  }

  /* ------------------------------------------- */
  /* SAVE ORDER — FIXED INDEXING */
  /* ------------------------------------------- */

  async function saveOrder() {
    setSavingOrder(true);

    try {
      await Promise.all(
        ads.map((ad, idx) =>
          supabase
            .from("slide_ads")
            .update({ order_index: idx })
            .eq("id", ad.id)
        )
      );

      await loadAds();
      setReorderMode(false);
    } finally {
      setSavingOrder(false);
    }
  }

  /* ------------------------------------------- */
  /* UI — UNTOUCHED EXACTLY LIKE YOU REQUIRED    */
  /* ------------------------------------------- */

  return (
    <div
      className={cn('fixed', 'inset-0', 'bg-black/70', 'backdrop-blur-md', 'z-[9999]', 'flex', 'items-center', 'justify-center')}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn('relative', 'w-full', 'max-w-[960px]', 'max-h-[90vh]', 'rounded-2xl', 'border', 'border-blue-500/30', 'bg-gradient-to-br', 'from-[#0b0f1a]/95', 'to-[#111827]/95', 'shadow-[0_0_40px_rgba(0,140,255,0.45)]', 'p-6', 'flex', 'flex-col', 'overflow-hidden')}
      >
        {/* close */}
        <button
          onClick={onClose}
          className={cn('absolute', 'top-3', 'right-3', 'text-white', 'text-xl')}
        >
          ✕
        </button>

        {/* header */}
        <div className={cn('text-center', 'mb-4', 'border-b', 'border-white/10', 'pb-3')}>
          <h1 className={cn('text-2xl', 'font-bold', 'bg-gradient-to-r', 'from-blue-400', 'to-cyan-400', 'bg-clip-text', 'text-transparent')}>
            Ad Injector Manager
          </h1>
        </div>

        {/* controls */}
        <div className={cn('flex', 'items-center', 'justify-between', 'bg-white/5', 'rounded-lg', 'px-4', 'py-3', 'mb-4', 'border', 'border-white/10')}>
          <div className={cn('flex', 'items-center', 'gap-3')}>
            <span className={cn('text-sm', 'text-white/80', 'font-medium')}>Ad Injector:</span>

            <div
              onClick={async () => {
                const enabled = !injectorEnabled;
                setInjectorEnabled(enabled);
                await saveHostSettings(enabled, triggerInterval);
              }}
              className={cn(
                "relative w-14 h-7 rounded-full cursor-pointer transition-all",
                injectorEnabled
                  ? "bg-green-500 shadow-[0_0_12px_rgba(0,255,128,0.5)]"
                  : "bg-gray-600"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-all",
                  injectorEnabled ? "translate-x-7" : ""
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
                const v = Number(e.target.value);
                setTriggerInterval(v);
                saveHostSettings(injectorEnabled, v);
              }}
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
        </div>

        {/* upload */}
        <label className={cn('border', 'border-dashed', 'border-blue-500/40', 'rounded-lg', 'bg-gradient-to-br', 'from-blue-500/5', 'to-cyan-400/5', 'hover:from-blue-500/10', 'hover:to-cyan-400/10', 'transition-all', 'cursor-pointer', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-6', 'mb-3')}>
          <p className={cn('text-sm', 'font-medium', 'text-blue-100/80')}>Upload Ads</p>
          <input
            type="file"
            multiple
            hidden
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </label>

        {/* grid */}
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
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, i)}
                  className={cn(
                    "relative rounded-lg overflow-hidden border border-white/10 bg-white/10 transition-all",
                    reorderMode ? "cursor-move ring-2 ring-blue-400/50" : ""
                  )}
                >
                  <span className={cn('absolute', 'top-1', 'left-1', 'bg-blue-500/80', 'text-white', 'text-[10px]', 'px-2', 'py-[1px]', 'rounded-full')}>
                    #{i + 1}
                  </span>

                  {ad.type === "image" ? (
                    <Image
                      src={ad.url}
                      alt=""
                      width={300}
                      height={200}
                      className={cn('h-32', 'w-full', 'object-cover')}
                      draggable={false}
                    />
                  ) : (
                    <video
                      src={ad.url}
                      muted
                      className={cn('h-32', 'w-full', 'object-cover')}
                      draggable={false}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div className={cn('mt-3', 'flex', 'justify-between', 'items-center')}>
          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={cn(
              "text-sm px-4 py-2 rounded-lg",
              reorderMode ? "bg-blue-600/70" : "bg-blue-600/40"
            )}
          >
            {reorderMode ? "Done Reordering" : "Reorder Ads"}
          </button>

          {reorderMode && (
            <button
              onClick={saveOrder}
              disabled={savingOrder}
              className={cn('text-sm', 'px-4', 'py-2', 'rounded-lg', 'bg-green-600/60')}
            >
              {savingOrder ? "Saving…" : "✅ Save Order"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
