"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AdRow = {
  id: string;
  host_profile_id: string | null;
  master_id: string | null;
  fan_wall_id: string | null;
  type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  duration_seconds: string | number | null;
  order_index: number;
  play_audio: boolean | null;
  active: boolean | null;
  storage_path?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function AdsManagerPage() {
  const search = useSearchParams();
  const params = useParams();

  const hostId = params.hostId as string;
  const masterMode = search.get("master") === "true";

  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [injectSpeed, setInjectSpeed] = useState("medium");
  const [injectorEnabled, setInjectorEnabled] = useState(true);

  // drag state
  const dragFromId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const maxImages = masterMode ? 30 : 10;
  const maxVideos = masterMode ? 10 : 2;

  async function loadAds() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("host_profile_id", hostId)
      .order("order_index", { ascending: true });

    if (!error) setAds((data as AdRow[]) || []);
    setLoading(false);
  }

  // ---------- Upload helpers ----------
  async function uploadFiles(fileList: FileList) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    // Count current types
    let currentImages = ads.filter(a => a.type === "image").length;
    let currentVideos = ads.filter(a => a.type === "video").length;

    const uploads: Promise<any>[] = [];

    Array.from(fileList).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (isVideo && currentVideos >= maxVideos) return;
      if (isImage && currentImages >= maxImages) return;

      const type: "image" | "video" = isVideo ? "video" : "image";
      if (type === "video") currentVideos += 1;
      else currentImages += 1;

      const bucket = type === "image" ? "ads-images" : "ads-videos";
      const filePath = `${hostId}/${Date.now()}-${file.name}`;

      const p = (async () => {
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadErr) throw uploadErr;

        const publicUrl = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;

        const { error: insertErr } = await supabase.from("ads").insert({
          host_profile_id: hostId,
          master_id: masterMode ? hostId : null,
          type,
          url: publicUrl,
          storage_path: filePath,
          order_index: 9999, // temp; will compact below
          active: true,
        });

        if (insertErr) throw insertErr;
      })();

      uploads.push(p);
    });

    try {
      await Promise.all(uploads);
      // Compact/normalize order_index after batch insert
      await normalizeOrder();
      await loadAds();
    } catch (e) {
      console.error(e);
      alert("Some files failed to upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDropUpload(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files?.length) await uploadFiles(files);
  }

  // Normalize order_index sequentially
  async function normalizeOrder() {
    const { data } = await supabase
      .from("ads")
      .select("id, order_index")
      .eq("host_profile_id", hostId)
      .order("order_index", { ascending: true });

    const ordered = (data || []) as { id: string; order_index: number }[];
    for (let i = 0; i < ordered.length; i++) {
      const row = ordered[i];
      if (row.order_index !== i) {
        await supabase.from("ads").update({ order_index: i }).eq("id", row.id);
      }
    }
  }

  async function uploadFromPicker(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files?.length) await uploadFiles(files);
    e.currentTarget.value = ""; // reset
  }

  // ---------- Delete ----------
  async function deleteAd(ad: AdRow) {
    if (!masterMode && ad.master_id) {
      alert("Only the master account can delete this.");
      return;
    }

    const bucket = ad.type === "image" ? "ads-images" : "ads-videos";
    if (ad.storage_path) {
      await supabase.storage.from(bucket).remove([ad.storage_path]);
    }

    await supabase.from("ads").delete().eq("id", ad.id);
    await normalizeOrder();
    await loadAds();
  }

  // ---------- Drag-swap (HTML5) ----------
  function onDragStart(id: string) {
    dragFromId.current = id;
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>, id: string) {
    e.preventDefault(); // allow drop
    if (dragOverId !== id) setDragOverId(id);
  }

  async function onDrop(id: string) {
    const fromId = dragFromId.current;
    setDragOverId(null);
    dragFromId.current = null;

    if (!fromId || fromId === id) return;

    const a = ads.find((x) => x.id === fromId);
    const b = ads.find((x) => x.id === id);
    if (!a || !b) return;

    // optimistic swap in UI
    const newAds = ads.map((item) => {
      if (item.id === a.id) return { ...item, order_index: b.order_index };
      if (item.id === b.id) return { ...item, order_index: a.order_index };
      return item;
    }).sort((x, y) => x.order_index - y.order_index);

    setAds(newAds);

    // persist swap
    await supabase.from("ads").update({ order_index: b.order_index }).eq("id", a.id);
    await supabase.from("ads").update({ order_index: a.order_index }).eq("id", b.id);

    // reload to be safe
    await loadAds();
  }

  useEffect(() => {
    loadAds();
  }, []);

  const imageCount = useMemo(() => ads.filter(a => a.type === "image").length, [ads]);
  const videoCount = useMemo(() => ads.filter(a => a.type === "video").length, [ads]);

  return (
    <div className={cn("bg-black text-white w-full h-full p-4 overflow-hidden flex flex-col gap-3 relative")}>

      {/* CLOSE */}
      <button
        onClick={() => window.close()}
        className={cn(
          "absolute top-2 left-2 px-3 py-1 bg-red-600 hover:bg-red-700",
          "text-white text-xs font-semibold border border-red-900 rounded-sm shadow z-20"
        )}
      >
        CLOSE
      </button>

      {/* HEADER */}
      <div className={cn("flex justify-end items-center relative mb-1 z-20")}>
        <div className={cn("absolute left-0 right-0 text-center pointer-events-none")}>
          <h1 className={cn("text-2xl font-bold")}>AD Injector Manager</h1>
          <p className={cn("text-red-400 text-xs mt-1")}>
            Images &amp; videos must be 1920×1080 • MP4 less than 15s
          </p>
        </div>

        {/* Speed */}
        <select
          className={cn("bg-gray-800 text-xs rounded px-2 py-1 border border-gray-600 z-20")}
          value={injectSpeed}
          onChange={(e) => setInjectSpeed(e.target.value)}
        >
          <option value="fast">Fast (8)</option>
          <option value="medium">Medium (12)</option>
          <option value="slow">Slow (24)</option>
        </select>

        {/* Toggle */}
        <label className={cn("flex items-center gap-2 ml-2 z-20")}>
          <span className={cn("text-xs opacity-60")}>Injector</span>
          <label className={cn("relative inline-flex items-center cursor-pointer")}>
            <input
              type="checkbox"
              className={cn("sr-only peer")}
              checked={injectorEnabled}
              onChange={() => setInjectorEnabled(!injectorEnabled)}
            />
            <div className={cn("w-14 h-7 bg-gray-600 rounded-full peer-checked:bg-green-500 transition")} />
            <span className={cn("absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition peer-checked:translate-x-7")} />
          </label>
        </label>
      </div>

      {/* BODY */}
      <div className={cn("flex flex-col gap-3 relative flex-1")}>

        {/* Upload (supports click, multi-select, and drag-drop) */}
        <label
          className={cn(
            "border border-dashed border-gray-500 rounded-lg bg-white/5 hover:bg-white/10",
            "cursor-pointer flex flex-col items-center justify-center p-6 text-sm"
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropUpload}
        >
          <span className="opacity-80">Drag &amp; Drop files here</span>
          <span className={cn("text-xs opacity-40")}>(or click to upload)</span>

          <input
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={uploadFromPicker}
          />
        </label>

        {/* Limits */}
        <p className={cn("text-red-400 text-xs text-center -mt-2")}>
          {masterMode
            ? `Master Limit: ${imageCount}/${maxImages} images • ${videoCount}/${maxVideos} videos`
            : `Host Limit: ${imageCount}/${maxImages} images • ${videoCount}/${maxVideos} videos`}
        </p>

        <div className={cn("border-t border-gray-700 opacity-40")} />

        {/* Reel Order — 4-column grid (unchanged look) */}
        <div className={cn("flex-1 rounded-lg border border-gray-600 bg-white/5 p-3 flex flex-col")}>
          <p className={cn("text-sm font-semibold text-center mb-1")}>AD Reel Display Order</p>
          <p className={cn("text-[10px] text-center mb-2 opacity-60")}>Drag a tile onto another to swap positions</p>

          <div className={cn("grid grid-cols-4 gap-3 pr-1 pb-2 overflow-auto")}>
            {loading ? (
              <p className={cn("col-span-4 text-center text-sm opacity-60 mt-8")}>Loading...</p>
            ) : ads.length === 0 ? (
              <div className={cn("col-span-4 h-full flex items-center justify-center text-gray-400 text-xs text-center px-4")}>
                No ads yet.<br />Upload above to build your reel.
              </div>
            ) : (
              ads.map((ad) => {
                const isDragOver = dragOverId === ad.id;
                return (
                  <div
                    key={ad.id}
                    draggable
                    onDragStart={() => onDragStart(ad.id)}
                    onDragOver={(e) => onDragOver(e, ad.id)}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={() => onDrop(ad.id)}
                    className={cn(
                      "relative rounded-lg overflow-hidden p-1 bg-white/10 group select-none",
                      !!ad.master_id && !masterMode && "border border-gray-500 opacity-80",
                      "transition ring-0",
                      isDragOver && "ring-2 ring-blue-400"
                    )}
                    style={{ cursor: "grab" }}
                    title={`Slot ${ad.order_index + 1}`}
                  >
                    {ad.type === "image" ? (
                      <Image
                        src={ad.url}
                        alt={`ad-${ad.order_index}`}
                        width={300}
                        height={200}
                        className={cn('rounded-lg', 'object-cover', 'w-full', 'h-32')}
                        draggable={false}
                      />
                    ) : (
                      <video
                        src={ad.url}
                        muted
                        playsInline
                        className={cn('rounded-lg', 'w-full', 'h-32', 'object-cover')}
                        draggable={false}
                      />
                    )}

                    {(!ad.master_id || masterMode) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAd(ad);
                        })}
                        className={cn('absolute', 'top-2', 'right-2', 'bg-red-600', 'text-xs', 'px-2', 'py-1', 'rounded', 'opacity-0', 'group-hover:opacity-100')}
                      >
                        ✕
                      </button>
                    )}
                    <div className={cn('absolute', 'bottom-1', 'left-1', 'text-[10px]', 'bg-black/60', 'px-1', 'rounded')}>
                      #{ad.order_index + 1}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {!injectorEnabled && (
          <div className={cn("absolute top-28 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center text-white font-semibold text-sm")}>
            Ads Disabled — Turn Injector ON to Control
          </div>
        )}
      </div>

      {uploading && (
        <div className={cn("fixed bottom-2 left-2 bg-white/20 text-sm p-2 rounded")}>
          Uploading…
        </div>
      )}
    </div>
  );
}
