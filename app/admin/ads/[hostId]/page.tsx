"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Reorder } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AdsManagerPage() {
  const search = useSearchParams();
  const params = useParams();

  const hostId = params.hostId as string;
  const masterMode = search.get("master") === "true";

  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [injectSpeed, setInjectSpeed] = useState("medium");
  const [injectorEnabled, setInjectorEnabled] = useState(true);

  const maxImages = masterMode ? 30 : 10;
  const maxVideos = masterMode ? 10 : 2;

  async function loadAds() {
    setLoading(true);
    const { data } = await supabase
      .from("ads")
      .select("*")
      .eq("host_profile_id", hostId)
      .order("order_index", { ascending: true });

    setAds(data || []);
    setLoading(false);
  }

  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const type = file.type.startsWith("video/") ? "video" : "image";

      const imageCount = ads.filter(a => a.type === "image").length;
      const videoCount = ads.filter(a => a.type === "video").length;

      if (type === "image" && imageCount >= maxImages) continue;
      if (type === "video" && videoCount >= maxVideos) continue;

      const bucket = type === "image" ? "ads-images" : "ads-videos";
      const filePath = `${hostId}/${Date.now()}-${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadErr) {
        console.error(uploadErr);
        continue;
      }

      const publicUrl = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;

      await supabase.from("ads").insert({
        host_profile_id: hostId,
        master_id: masterMode ? hostId : null,
        type,
        url: publicUrl,
        storage_path: filePath,
        order_index: ads.length,
        active: true,
      });
    }

    await loadAds();
    setUploading(false);
  };

  async function saveOrder(newOrder: any[]) {
    setAds(newOrder); // ✅ immediate UI update

    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from("ads")
        .update({ order_index: i })
        .eq("id", newOrder[i].id);
    }
  }

  async function deleteAd(ad: any) {
    if (!masterMode && ad.master_id) {
      alert("Only the master account can delete this.");
      return;
    }

    const bucket = ad.type === "image" ? "ads-images" : "ads-videos";

    if (ad.storage_path) {
      await supabase.storage.from(bucket).remove([ad.storage_path]);
    }

    await supabase.from("ads").delete().eq("id", ad.id);
    await loadAds();
  }

  useEffect(() => {
    loadAds();
  }, []);

  return (
    <div
      className={cn(
        "bg-black text-white w-full h-full p-4 overflow-hidden flex flex-col gap-3 relative"
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        uploadFiles(e.dataTransfer.files);
      }}
    >
      {/* CLOSE BUTTON */}
      <button
        onClick={() => window.close()}
        className={cn('absolute', 'top-2', 'left-2', 'px-3', 'py-1', 'bg-red-600', 'hover:bg-red-700', 'text-white', 'text-xs', 'font-semibold', 'border', 'border-red-900', 'rounded-sm', 'shadow', 'z-20')}
      >
        CLOSE
      </button>

      {/* HEADER */}
      <div className={cn('flex', 'justify-end', 'items-center', 'relative', 'mb-1', 'z-20')}>
        <div className={cn('absolute', 'left-0', 'right-0', 'text-center', 'pointer-events-none')}>
          <h1 className={cn('text-2xl', 'font-bold')}>AD Injector Manager</h1>
          <p className={cn('text-red-400', 'text-xs', 'mt-1')}>
            Images & videos must be 1920×1080 • MP4 less than 15s
          </p>
        </div>

        <select
          className={cn('bg-gray-800', 'text-xs', 'rounded', 'px-2', 'py-1', 'border', 'border-gray-600', 'z-20')}
          value={injectSpeed}
          onChange={(e) => setInjectSpeed(e.target.value)}
        >
          <option value="fast">Fast (8)</option>
          <option value="medium">Medium (12)</option>
          <option value="slow">Slow (24)</option>
        </select>

        <label className={cn('flex', 'items-center', 'gap-2', 'ml-2', 'z-20')}>
          <span className={cn('text-xs', 'opacity-60')}>Injector</span>
          <label className={cn('relative', 'inline-flex', 'items-center', 'cursor-pointer')}>
            <input
              type="checkbox"
              className={cn('sr-only', 'peer')}
              checked={injectorEnabled}
              onChange={() => setInjectorEnabled(!injectorEnabled)}
            />
            <div className={cn('w-14', 'h-7', 'bg-gray-600', 'rounded-full', 'peer-checked:bg-green-500', 'transition')} />
            <span className={cn('absolute', 'left-1', 'top-1', 'bg-white', 'w-5', 'h-5', 'rounded-full', 'transition', 'peer-checked:translate-x-7')} />
          </label>
        </label>
      </div>

      {/* UPLOAD BOX */}
      <label className={cn('border', 'border-dashed', 'border-gray-500', 'rounded-lg', 'bg-white/5', 'hover:bg-white/10', 'cursor-pointer', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-6', 'text-sm')}>
        <span className="opacity-80">Drag & Drop files here</span>
        <span className={cn('text-xs', 'opacity-40')}>(or click to upload multiple)</span>

        <input
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => uploadFiles(e.target.files)}
        />
      </label>

      {/* ORDER LIST */}
      <div className={cn('flex-1', 'rounded-lg', 'border', 'border-gray-600', 'bg-white/5', 'p-3', 'flex', 'flex-col')}>
        <p className={cn('text-sm', 'font-semibold', 'text-center', 'mb-1')}>AD Reel Display Order</p>
        <p className={cn('text-[10px]', 'text-center', 'mb-2', 'opacity-60')}>Drag to rearrange playback</p>

        <div className={cn('flex-1', 'overflow-auto')}>
          {loading ? (
            <p className={cn('text-center', 'text-sm', 'opacity-60', 'mt-8')}>Loading...</p>
          ) : ads.length === 0 ? (
            <div className={cn('h-full', 'flex', 'items-center', 'justify-center', 'text-gray-400', 'text-xs', 'text-center', 'px-4')}>
              No ads yet.<br />Upload above to build your reel.
            </div>
          ) : (
            <Reorder.Group
              axis="xy"
              values={ads}
              onReorder={(newOrder) => {
                setAds(newOrder);
                saveOrder(newOrder);
              }}
              className={cn('grid', 'grid-cols-4', 'gap-3', 'pr-1', 'pb-2')}
            >
              {ads.map((ad) => (
                <Reorder.Item
                  key={ad.id}
                  value={ad}
                  className={cn('relative', 'rounded-lg', 'overflow-hidden', 'p-1', 'bg-white/10', 'group', 'cursor-grab', 'active:cursor-grabbing')}
                >
                  {ad.type === "image" ? (
                    <Image
                      src={ad.url}
                      alt="ad"
                      width={300}
                      height={200}
                      className={cn('rounded-lg', 'object-cover', 'w-full', 'h-32')}
                    />
                  ) : (
                    <video
                      src={ad.url}
                      muted
                      playsInline
                      className={cn('rounded-lg', 'w-full', 'h-32', 'object-cover')}
                    />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAd(ad);
                    }}
                    className={cn('absolute', 'top-2', 'right-2', 'bg-red-600', 'text-xs', 'px-2', 'py-1', 'rounded', 'opacity-0', 'group-hover:opacity-100')}
                  >
                    ✕
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}

          {uploading && (
            <div className={cn('fixed', 'bottom-2', 'left-2', 'bg-white/20', 'text-sm', 'p-2', 'rounded')}>
              Uploading…
            </div>
          )}
        </div>
      </div>

      {!injectorEnabled && (
        <div className={cn('absolute', 'top-28', 'left-0', 'right-0', 'bottom-0', 'bg-black/60', 'backdrop-blur-sm', 'z-10', 'flex', 'items-center', 'justify-center', 'text-white', 'font-semibold', 'text-sm')}>
          Ads Disabled — Turn Injector ON to Control
        </div>
      )}
    </div>
  );
}
