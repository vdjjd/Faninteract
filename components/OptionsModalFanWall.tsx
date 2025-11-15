'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { cn } from "../lib/utils";

const DEFAULT_GRADIENT =
  'linear-gradient(135deg,#0d47a1cc 0%, #0d47a199 45%, #1976d299 60%, #1976d2cc 100%)';

/* ------------------------------------------------------ */
/* GRADIENT + BRIGHTNESS HELPERS                          */
/* ------------------------------------------------------ */
function applyBrightnessToGradient(gradient: string, brightness: number) {
  if (!gradient?.includes('linear-gradient')) return gradient;

  const multiplier = brightness / 100;

  return gradient.replace(/(#\w{6})(\w{2})/g, (_, hex, alpha) => {
    const base = alpha ? parseInt(alpha, 16) : 255;
    const newAlpha = Math.max(0, Math.min(255, base * multiplier));
    return `${hex}${Math.round(newAlpha).toString(16).padStart(2, '0')}`;
  });
}

function buildGradient(start: string, end: string, pos: number, brightness: number) {
  const mid1 = pos;
  const mid2 = Math.min(pos + 15, 100);

  const raw = `
    linear-gradient(
      135deg,
      ${start} 0%,
      ${start}cc ${mid1}%,
      ${end}99 ${mid2}%,
      ${end} 100%
    )
  `.replace(/\s+/g, ' ');

  return applyBrightnessToGradient(raw, brightness);
}

function canonicalLayout(input?: string) {
  if (!input) return 'singleHighlight';
  const v = input.toLowerCase();
  if (v.includes('2x2')) return 'grid2x2';
  if (v.includes('4x2')) return 'grid4x2';
  return 'singleHighlight';
}

/* ------------------------------------------------------ */
/* MAIN COMPONENT                                         */
/* ------------------------------------------------------ */
export default function OptionsModalFanWall({
  wall,
  hostId,
  onClose,
  refreshFanWalls,
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [gradientPosition, setGradientPosition] = useState(wall.gradient_pos || 60);
  const [brightness, setBrightness] = useState(wall.background_brightness ?? 100);

  /* ------------------------------------------------------ */
  /* LOCAL WALL MODEL                                        */
  /* ------------------------------------------------------ */
  const [localWall, setLocalWall] = useState(() => {
    const start = wall.color_start || '#0d47a1';
    const end = wall.color_end || '#1976d2';
    const gradient = buildGradient(start, end, wall.gradient_pos || 60, wall.background_brightness ?? 100);

    return {
      ...wall,
      color_start: start,
      color_end: end,
      gradient_pos: wall.gradient_pos || 60,
      background_brightness: wall.background_brightness ?? 100,
      background_type: wall.background_type || 'gradient',
      background_value: wall.background_value || gradient,
      post_transition: wall.post_transition || "Fade In / Fade Out",
      transition_speed: wall.transition_speed || "Medium",
      auto_delete_minutes: wall.auto_delete_minutes ?? 0,
      countdown: wall.countdown || "none",
      layout_type: canonicalLayout(wall.layout_type),
    };
  });

  const layoutCanonical = canonicalLayout(localWall.layout_type);

  /* ------------------------------------------------------ */
  /* SAVE HANDLER                                           */
  /* ------------------------------------------------------ */
  async function handleSave() {
    try {
      setSaving(true);

      const layoutCanonical = canonicalLayout(localWall.layout_type);

      let finalBg = localWall.background_value;
      if (localWall.background_type === 'gradient') {
        finalBg = applyBrightnessToGradient(
          buildGradient(
            localWall.color_start,
            localWall.color_end,
            gradientPosition,
            brightness
          ),
          brightness
        );
      }

      const updates = {
        title: localWall.title?.trim() || null,
        host_title: localWall.host_title?.trim() || null,
        layout_type: layoutCanonical,
        post_transition: localWall.post_transition,
        transition_speed: localWall.transition_speed,
        countdown: localWall.countdown === "none" ? null : localWall.countdown,
        countdown_active: false,
        auto_delete_minutes: localWall.auto_delete_minutes,

        background_type: localWall.background_type,
        background_value: finalBg,
        color_start: localWall.color_start,
        color_end: localWall.color_end,
        gradient_pos: gradientPosition,
        background_brightness: brightness,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fan_walls')
        .update(updates)
        .eq('id', localWall.id);

      if (error) throw error;

      await refreshFanWalls?.();

      onClose();
    } catch (err) {
      console.error("SAVE ERROR:", err);
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------ */
  /* IMAGE UPLOAD                                           */
  /* ------------------------------------------------------ */
  async function handleImageUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);

      const preview = URL.createObjectURL(file);
      setLocalWall({
        ...localWall,
        background_type: 'image',
        background_value: preview,
      });

      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1900,
        useWebWorker: true,
      });

      const ext = file.type.split('/')[1];
      const path = `host_${hostId}/wall_${localWall.id}/background-${Date.now()}.${ext}`;

      await supabase.storage
        .from('wall-backgrounds')
        .upload(path, compressed, { upsert: true });

      const { data } = supabase.storage
        .from('wall-backgrounds')
        .getPublicUrl(path);

      const finalUrl = data.publicUrl;

      await supabase
        .from('fan_walls')
        .update({
          background_type: "image",
          background_value: finalUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localWall.id);

      setLocalWall({
        ...localWall,
        background_type: 'image',
        background_value: finalUrl,
      });

      await refreshFanWalls?.();
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
    } finally {
      setUploading(false);
    }
  }

  /* ------------------------------------------------------ */
  /* DELETE BACKGROUND                                      */
  /* ------------------------------------------------------ */
  async function handleDeleteImage() {
    try {
      await supabase
        .from('fan_walls')
        .update({
          background_type: 'gradient',
          background_value: DEFAULT_GRADIENT,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localWall.id);

      setLocalWall({
        ...localWall,
        background_type: 'gradient',
        background_value: DEFAULT_GRADIENT,
      });

      await refreshFanWalls?.();
    } catch (err) {
      console.error("DELETE IMAGE ERROR:", err);
    }
  }

  /* ------------------------------------------------------ */
  /* RENDER (NO SCROLL)                                     */
  /* ------------------------------------------------------ */
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
          "relative w-full max-w-[1100px] h-auto rounded-2xl",
          "border border-blue-500/30 shadow-[0_0_40px_rgba(0,140,255,0.45)]",
          "bg-gradient-to-br from-[#0b0f1a]/95 to-[#111827]/95 p-6 text-white"
        )}
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className={cn("absolute top-3 right-3 text-white/80 hover:text-white text-xl")}
        >
          ✕
        </button>

        {/* TITLE */}
        <h3 className={cn('text-center text-xl font-semibold mb-6')}>
          ⚙ Edit Fan Zone Wall
        </h3>

        {/* ---------------------- */}
        {/*   2 COLUMN LAYOUT      */}
        {/* ---------------------- */}
        <div className={cn('grid grid-cols-2 gap-8 w-full')}>

          {/* ---------------------- */}
          {/*   LEFT COLUMN (inputs) */}
          {/* ---------------------- */}
          <div className="space-y-4">

            {/* PUBLIC TITLE */}
            <div>
              <label className={cn('block', 'text-sm', 'font-semibold', 'mb-1')}>Public Title</label>
              <input
                className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'bg-black/40', 'border', 'border-white/10')}
                value={localWall.title || ""}
                onChange={(e) =>
                  setLocalWall({ ...localWall, title: e.target.value })
                }
              />
            </div>

            {/* DASHBOARD TITLE */}
            <div>
              <label className={cn('block', 'text-sm', 'font-semibold', 'mb-1')}>Private Dashboard Title</label>
              <input
                className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'bg-black/40', 'border', 'border-white/10')}
                value={localWall.host_title || ""}
                onChange={(e) =>
                  setLocalWall({ ...localWall, host_title: e.target.value })
                }
              />
            </div>

            {/* LAYOUT */}
            <div>
              <label className={cn('block', 'text-sm', 'font-semibold', 'mb-1')}>Layout</label>
              <select
                className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'bg-black/40', 'border', 'border-white/10')}
                value={layoutCanonical}
                onChange={(e) =>
                  setLocalWall({
                    ...localWall,
                    layout_type: canonicalLayout(e.target.value),
                  })
                }
              >
                <option value="singleHighlight">Single Highlight Post</option>
                <option value="grid2x2">2x2 Grid</option>
              </select>
            </div>

            {/* POST TRANSITION — FULLY ENABLED NOW */}
            <div>
              <label className={cn('block', 'text-sm', 'font-semibold', 'mb-1')}>Post Transition</label>
              <select
                className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'bg-black/40', 'border', 'border-white/10')}
                value={localWall.post_transition}
                onChange={(e) =>
                  setLocalWall({ ...localWall, post_transition: e.target.value })
                }
              >
                <option>Random</option>
                <option>Fade In / Fade Out</option>
                <option>Slide Up / Slide Out</option>
                <option>Slide Down / Slide Out</option>
                <option>Slide Left / Slide Right</option>
                <option>Slide Right / Slide Left</option>
                <option>Zoom In / Zoom Out</option>
                <option>Zoom Out / Zoom In</option>
                <option>Flip</option>
                <option>Rotate In / Rotate Out</option>
              </select>
            </div>

            {/* TRANSITION SPEED */}
            <div>
              <label className={cn('block', 'text-sm', 'font-semibold', 'mb-1')}>Transition Speed</label>
              <select
                className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'bg-black/40', 'border', 'border-white/10')}
                value={localWall.transition_speed}
                onChange={(e) =>
                  setLocalWall({ ...localWall, transition_speed: e.target.value })
                }
              >
                <option>Slow</option>
                <option>Medium</option>
                <option>Fast</option>
              </select>
            </div>

            {/* COUNTDOWN */}
            <div>
              <label className={cn('block', 'text-sm', 'font-semibold', 'mb-1')}>Countdown</label>
              <select
                className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'bg-black/40', 'border', 'border-white/10')}
                value={localWall.countdown || 'none'}
                onChange={(e) =>
                  setLocalWall({ ...localWall, countdown: e.target.value })
                }
              >
                <option value="none">No Countdown</option>
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
                  '30 Minutes',
                  '40 Minutes',
                  '50 Minutes',
                  '60 Minutes',
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* AUTO DELETE */}
            <div>
              <label className={cn('block', 'text-sm', 'font-semibold', 'mb-1')}>Auto-Delete Posts</label>
              <select
                className={cn('w-full', 'px-3', 'py-2', 'rounded-lg', 'bg-black/40', 'border', 'border-white/10')}
                value={localWall.auto_delete_minutes}
                onChange={(e) =>
                  setLocalWall({
                    ...localWall,
                    auto_delete_minutes: Number(e.target.value),
                  })
                }
              >
                <option value={0}>Disabled</option>
                {[5, 10, 20, 30, 40, 50, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} Minutes
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* -------------------------- */}
          {/*   RIGHT COLUMN (preview)   */}
          {/* -------------------------- */}
          <div className="space-y-6">

            {/* PREVIEW */}
            <div className="text-center">
              <div
                className={cn('w-[180px]', 'h-[100px]', 'mx-auto', 'rounded-md', 'border', 'border-white/20', 'shadow-inner')}
                style={{
                  background:
                    localWall.background_type === 'image'
                      ? `url(${localWall.background_value}) center/cover no-repeat`
                      : localWall.background_value,
                }}
              />
              <p className={cn('text-xs', 'text-gray-300', 'mt-2')}>
                {localWall.background_type === 'image'
                  ? 'Current Background Image'
                  : 'Current Gradient Background'}
              </p>
            </div>

            {/* COLOR PICKERS */}
            <div className={cn('flex', 'justify-center', 'gap-10')}>
              {['Left Color', 'Right Color'].map((label, i) => (
                <div key={label}>
                  <label className={cn('block', 'text-xs', 'mb-1', 'text-center')}>{label}</label>
                  <input
                    type="color"
                    className={cn('w-[60px]', 'h-[40px]', 'rounded-md', 'cursor-pointer')}
                    value={i === 0 ? localWall.color_start : localWall.color_end}
                    onChange={(e) => {
                      const newStart =
                        i === 0 ? e.target.value : localWall.color_start;
                      const newEnd =
                        i === 1 ? e.target.value : localWall.color_end;

                      const g = buildGradient(
                        newStart,
                        newEnd,
                        gradientPosition,
                        brightness
                      );

                      setLocalWall({
                        ...localWall,
                        color_start: newStart,
                        color_end: newEnd,
                        background_type: 'gradient',
                        background_value: g,
                      });
                    }}
                  />
                </div>
              ))}
            </div>

            {/* GRADIENT POSITION SLIDER */}
            <div className={cn('flex', 'flex-col', 'items-center')}>
              <label className={cn('text-xs', 'mb-1')}>Gradient Position</label>
              <input
                type="range"
                min={0}
                max={100}
                value={gradientPosition}
                className={cn('w-[60%]', 'accent-blue-400')}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setGradientPosition(num);

                  const g = buildGradient(
                    localWall.color_start,
                    localWall.color_end,
                    num,
                    brightness
                  );

                  setLocalWall({
                    ...localWall,
                    gradient_pos: num,
                    background_type: 'gradient',
                    background_value: g,
                  });
                }}
              />
              <p className={cn('text-xs', 'mt-1')}>{gradientPosition}%</p>
            </div>

            {/* BRIGHTNESS SLIDER */}
            <div className={cn('flex', 'flex-col', 'items-center')}>
              <label className={cn('text-xs', 'mb-1')}>Background Brightness</label>

              <input
                type="range"
                min={20}
                max={150}
                value={brightness}
                className={cn('w-[60%]', 'accent-blue-400')}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setBrightness(num);

                  const g = buildGradient(
                    localWall.color_start,
                    localWall.color_end,
                    gradientPosition,
                    num
                  );

                  setLocalWall({
                    ...localWall,
                    background_brightness: num,
                    background_type: 'gradient',
                    background_value: g,
                  });
                }}
              />

              <p className={cn('text-xs', 'mt-1')}>{brightness}%</p>
            </div>

            {/* UPLOAD */}
            <div className={cn('flex', 'flex-col', 'items-center')}>
              <p className={cn('text-sm', 'font-semibold', 'mb-2')}>Upload Background</p>

              <label
                htmlFor="fileUpload"
                className={cn('px-4', 'py-2', 'rounded-md', 'bg-blue-600', 'hover:bg-blue-700', 'text-white', 'font-semibold', 'cursor-pointer')}
              >
                Choose File
              </label>

              <input
                id="fileUpload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />

              <p className={cn('text-xs', 'text-gray-300', 'mt-2', 'text-center')}>
                {uploading
                  ? 'Uploading…'
                  : localWall.background_type === 'image'
                  ? localWall.background_value?.split('/').pop()
                  : 'No file chosen'}
              </p>
            </div>
          </div>
        </div>

        {/* -------------------------- */}
        {/*        FOOTER (centered)   */}
        {/* -------------------------- */}
        <div className={cn('flex', 'justify-center', 'items-center', 'gap-4', 'border-t', 'border-white/10', 'mt-8', 'pt-4')}>

          <button
            onClick={handleDeleteImage}
            className={cn('px-4', 'py-2', 'rounded-md', 'text-sm', 'bg-red-600/80', 'hover:bg-red-700', 'font-medium')}
          >
            Delete Background
          </button>

          <button
            onClick={onClose}
            className={cn('px-4', 'py-2', 'rounded-md', 'text-sm', 'bg-white/10', 'hover:bg-white/15', 'font-medium')}
          >
            Cancel
          </button>

          <button
            disabled={saving}
            onClick={handleSave}
            className={
              saving
                ? "px-4 py-2 rounded-md text-sm border font-medium opacity-60 cursor-wait"
                : "px-4 py-2 rounded-md text-sm border font-medium bg-emerald-600/80 border-emerald-500 hover:bg-emerald-600"
            }
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

        </div>

      </div>
    </div>
  );
}
