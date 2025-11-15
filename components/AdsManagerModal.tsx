'use client';

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { Lock, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/* TYPES */
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
  is_master_ad: boolean;
  is_host_ad: boolean;
}

/* Utility: arrayMove */
function arrayMove<T>(arr: T[], from: number, to: number) {
  const clone = [...arr];
  const item = clone[from];
  clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

export default function AdsManagerModal({ host, onClose }: AdsManagerModalProps) {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [triggerInterval, setTriggerInterval] = useState(8);

  // 🔥 DEFAULT OFF
  const [injectorEnabled, setInjectorEnabled] = useState(false);

  const [continuousMode, setContinuousMode] = useState(false);

  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const dragFrom = useRef<number | null>(null);

  const isMaster = host?.role === "master";

  /* ---------------------------------------------------
     LOAD SETTINGS + ADS (NO REALTIME)
  --------------------------------------------------- */
  useEffect(() => {
    if (!host?.id) return;

    if (!isMaster) loadHostSettings();
    loadMixedAds();
  }, [host?.id]);

  async function loadHostSettings() {
    const { data } = await supabase
      .from("hosts")
      .select("injector_enabled, trigger_interval, continuous_mode")
      .eq("id", host.id)
      .single();

    if (data) {
      // respects DB values
      setInjectorEnabled(!!data.injector_enabled);
      setTriggerInterval(Number(data.trigger_interval ?? 8) || 8);
      setContinuousMode(!!data.continuous_mode);
    }
  }

  async function loadMixedAds() {
    setLoading(true);

    const { data, error } = await supabase
      .from("slide_ads")
      .select("*")
      .or(`master_id.is.not.null,host_profile_id.eq.${host.id}`)
      .order("is_master_ad", { ascending: false })
      .order("order_index", { ascending: true });

    if (!error && data) setAds(data as AdItem[]);
    setLoading(false);
  }

  /* ---------------------------------------------------
     SAVE INJECTOR TOGGLE (NO REALTIME)
  --------------------------------------------------- */
  async function saveInjectorEnabled(value: boolean) {
    await supabase
      .from("hosts")
      .update({ injector_enabled: value })
      .eq("id", host.id);

    setInjectorEnabled(value);
  }

  /* ---------------------------------------------------
     SAVE ORDER
  --------------------------------------------------- */
  async function saveOrder() {
    setSavingOrder(true);

    const updates = ads.map((ad, index) => {
      if (!isMaster && ad.is_master_ad) return null;
      return supabase.from("slide_ads").update({ order_index: index }).eq("id", ad.id);
    });

    await Promise.all(updates.filter(Boolean));
    await loadMixedAds();

    setSavingOrder(false);
    setReorderMode(false);
  }

  /* ---------------------------------------------------
     DELETE AD
  --------------------------------------------------- */
  async function deleteAd(ad: AdItem) {
    if (!isMaster && ad.is_master_ad) return;

    await supabase.from("slide_ads").delete().eq("id", ad.id);

    if (ad.storage_path) {
      await supabase.storage.from("ads").remove([ad.storage_path]);
    }

    await loadMixedAds();
  }

  /* ---------------------------------------------------
     UPLOAD AD
  --------------------------------------------------- */
  async function handleFileUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop();
    const uuid = crypto.randomUUID();
    const path = `${host.id}/${uuid}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("ads")
      .upload(path, file);

    if (uploadErr) return alert("Upload failed");

    const { data: { publicUrl } } = supabase.storage.from("ads").getPublicUrl(path);

    await supabase.from("slide_ads").insert({
      host_profile_id: isMaster ? null : host.id,
      master_id: isMaster ? host.id : null,
      url: publicUrl,
      type: file.type.startsWith("video") ? "video" : "image",
      storage_path: path,
      order_index: ads.length,
    });

    await loadMixedAds();
  }

  /* ---------------------------------------------------
     DRAG / DROP with SNAP BACK
  --------------------------------------------------- */
  function handleDragStart(e: any, index: number, locked: boolean) {
    if (!reorderMode) return;
    if (!isMaster && locked) return;
    dragFrom.current = index;
  }

  function handleDragOver(e: any) {
    if (!reorderMode) return;
    e.preventDefault();
  }

  function handleDrop(e: any, index: number, locked: boolean) {
    if (!reorderMode) return;
    if (dragFrom.current === null) return;

    const from = dragFrom.current;
    const to = index;

    const draggedAd = ads[from];

    if (!isMaster) {
      const movingHostAdUpOverCorp =
        draggedAd.is_host_ad &&
        ads[to]?.is_master_ad &&
        to < from;

      if (movingHostAdUpOverCorp) {
        dragFrom.current = null;
        return;
      }
    }

    const newOrder = arrayMove(ads, from, to);
    setAds(newOrder);
    dragFrom.current = null;
  }

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */
  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center"
      )}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-[960px] max-h-[90vh] rounded-2xl border border-blue-500/30",
          "bg-gradient-to-br from-[#0b0f1a]/95 to-[#111827]/95 shadow-[0_0_40px_rgba(0,140,255,0.45)]",
          "p-6 flex flex-col overflow-hidden"
        )}
      >
        {/* CLOSE */}
        <button onClick={onClose} className={cn('absolute', 'top-3', 'right-3', 'text-white', 'text-xl')}>
          ✕
        </button>

        {/* TITLE */}
        <div className={cn('text-center', 'mb-4', 'border-b', 'border-white/10', 'pb-3')}>
          <h1 className={cn('text-2xl', 'font-bold', 'bg-gradient-to-r', 'from-blue-400', 'to-cyan-400', 'bg-clip-text', 'text-transparent')}>
            Ad Manager
          </h1>
        </div>

        {/* INJECTOR SWITCH (host only) */}
        {!isMaster && (
          <div className={cn('flex', 'items-center', 'justify-between', 'bg-white/5', 'border', 'border-white/10', 'px-4', 'py-3', 'rounded-lg', 'mb-5')}>
            <span className={cn('text-white/80', 'text-sm', 'font-medium')}>Ad Injector</span>

            <div
              onClick={() => saveInjectorEnabled(!injectorEnabled)}
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
        )}

        {/* UPLOAD + REORDER */}
        <div className={cn('mb-4', 'flex', 'items-center', 'gap-3')}>
          <label className={cn('cursor-pointer', 'flex', 'items-center', 'gap-2', 'text-white/80', 'border', 'border-white/20', 'px-3', 'py-2', 'rounded-lg', 'hover:bg-white/10')}>
            <Upload size={18} />
            Upload Ad
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
          </label>

          <button
            className={cn(
              "px-4 py-2 rounded-lg border border-white/10 text-white/90",
              reorderMode ? "bg-blue-600" : "bg-white/10"
            )}
            onClick={() => setReorderMode(!reorderMode)}
          >
            {reorderMode ? "Done" : "Reorder"}
          </button>
        </div>

        {/* GRID */}
        <div className={cn('grid', 'grid-cols-3', 'gap-3', 'overflow-y-auto', 'pr-2')}>
          {ads.map((ad, i) => {
            const locked = ad.is_master_ad && !isMaster;

            return (
              <div
                key={ad.id}
                draggable={reorderMode && !locked}
                onDragStart={(e) => handleDragStart(e, i, locked)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, i, locked)}
                className={cn(
                  "relative rounded-lg overflow-hidden border cursor-pointer select-none",
                  locked
                    ? "border-amber-400/40 bg-amber-700/20 opacity-80"
                    : "border-white/10 bg-white/5"
                )}
              >
                {/* LOCK BADGE */}
                {locked && (
                  <div className={cn('absolute', 'top-2', 'right-2', 'bg-amber-600/90', 'text-white', 'p-1', 'rounded-full', 'z-20')}>
                    <Lock size={14} />
                  </div>
                )}

                {/* DELETE */}
                {(isMaster || ad.is_host_ad) && (
                  <button
                    onClick={() => deleteAd(ad)}
                    className={cn('absolute', 'top-2', 'left-2', 'bg-red-600/80', 'text-white', 'p-1', 'rounded-full', 'z-20')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {/* PREVIEW */}
                {ad.type === "image" ? (
                  <Image src={ad.url} alt="" width={300} height={200} className={cn('object-cover', 'w-full', 'h-32')} />
                ) : (
                  <video src={ad.url} muted className={cn('object-cover', 'w-full', 'h-32')} />
                )}

                {/* ORDER */}
                <div className={cn('absolute', 'bottom-1', 'left-1', 'bg-black/50', 'text-white', 'text-xs', 'px-2', 'py-0.5', 'rounded')}>
                  #{i + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* SAVE ORDER */}
        {reorderMode && (
          <button
            disabled={savingOrder}
            onClick={saveOrder}
            className={cn('mt-4', 'w-full', 'py-2', 'bg-blue-600', 'hover:bg-blue-500', 'text-white', 'rounded-lg')}
          >
            {savingOrder ? "Saving…" : "Save Order"}
          </button>
        )}
      </div>
    </div>
  );
}
