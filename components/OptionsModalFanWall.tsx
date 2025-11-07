'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import { cn } from "../lib/utils";
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

/* -------------------------------------------------------- */
/* ✅ BRIGHTNESS APPLIES ONLY TO GRADIENT */
/* -------------------------------------------------------- */
function applyBrightnessToGradient(gradient: string, brightness: number) {
  if (!gradient?.includes('linear-gradient')) return gradient;
  const mult = brightness / 100;

  return gradient.replace(/(#\w{6})(\w{2})/g, (match, hex, alpha) => {
    const base = alpha ? parseInt(alpha, 16) : 255;
    const newA = Math.min(255, Math.max(0, base * mult));
    return `${hex}${Math.round(newA).toString(16).padStart(2, '0')}`;
  });
}

/* -------------------------------------------------------- */
/* ✅ BUILD GRADIENT */
/* -------------------------------------------------------- */
function buildGradient(start: string, end: string, pos: number, brightness: number) {
  const mid1 = pos;
  const mid2 = Math.min(pos + 15, 100);

  const g = `
    linear-gradient(
      135deg,
      ${start} 0%,
      ${start}cc ${mid1}%,
      ${end}99 ${mid2}%,
      ${end} 100%
    )
  `.replace(/\s+/g, " ");

  return applyBrightnessToGradient(g, brightness);
}

/* -------------------------------------------------------- */
/* ✅ CANONICAL LAYOUT NORMALIZER */
/* -------------------------------------------------------- */
function canonicalLayout(input?: string): 'Single Highlight Post' | '2x2 Grid' | '4x2 Grid' {
  const raw = (input || '').toLowerCase().replace(/\s+/g, ' ').trim();

  if (
    raw.includes('single') ||
    raw.replace(/[^a-z0-9]/g, '') === 'singlehighlightpost'
  ) return 'Single Highlight Post';

  if (raw.includes('2x2') || /2.*(column|col).*(2.*(row|r))/.test(raw)) return '2x2 Grid';
  if (raw.includes('4x2') || /4.*(column|col).*(2.*(row|r))/.test(raw)) return '4x2 Grid';

  return 'Single Highlight Post';
}

/* -------------------------------------------------------- */
/* ✅ COMPONENT */
/* -------------------------------------------------------- */
export default function OptionsModalFanWall({
  wall,
  hostId,
  onClose,
  refreshFanWalls,
}) {
  const channelRef = useRealtimeChannel(); 

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [gradientPosition, setGradientPosition] = useState(wall.gradient_pos || 60);
  const [brightness, setBrightness] = useState(wall.background_brightness ?? 100);

  /* LOCAL STATE */
  const [localWall, setLocalWall] = useState<any>(() => {
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
      layout_type: canonicalLayout(wall.layout_type || "Single Highlight Post"),
    };
  });

  /* -------------------------------------------------------- */
  /* ✅ SAVE */
  /* -------------------------------------------------------- */
  async function handleSave() {
    try {
      setSaving(true);

      const layoutCanonical = canonicalLayout(localWall.layout_type);
      const isSingle = layoutCanonical === 'Single Highlight Post';

      let finalBg = localWall.background_value;
      if (localWall.background_type === "gradient") {
        finalBg = applyBrightnessToGradient(finalBg, brightness);
      }

      const countdownValue =
        !localWall.countdown || localWall.countdown === "none"
          ? null
          : localWall.countdown;

      const updates: Record<string, any> = {
        title: localWall.title?.trim() || null,
        host_title: localWall.host_title?.trim() || null,

        layout_type: layoutCanonical,
        post_transition: isSingle ? (localWall.post_transition || "Fade In / Fade Out") : "Fade In / Fade Out",
        transition_speed: localWall.transition_speed,

        countdown: countdownValue,
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

      for (const key in updates) {
        if (updates[key] === undefined || updates[key] === "") {
          delete updates[key];
        }
      }

      const { error } = await supabase
        .from("fan_walls")
        .update(updates)
        .eq("id", localWall.id);

      if (error) throw error;

      const channel = channelRef?.current;
      if (channel) {
        await channel.send({
          type: "broadcast",
          event: "wall_updated",
          payload: { id: localWall.id, ...updates },
        });
      }

      await refreshFanWalls?.();
      onClose();

    } catch (err) {
      console.error("❌ Save Error:", err);
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------- */
  /* ✅ IMAGE UPLOAD */
  /* -------------------------------------------------------- */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const preview = URL.createObjectURL(file);
      setLocalWall(prev => ({
        ...prev,
        background_type: "image",
        background_value: preview,
      }));

      setUploading(true);

      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1900,
        useWebWorker: true,
      });

      const ext = file.type.split("/")[1];
      const path = `host_${hostId}/wall_${localWall.id}/background-${Date.now()}.${ext}`;

      await supabase.storage
        .from("wall-backgrounds")
        .upload(path, compressed, { upsert: true });

      const { data } = supabase.storage
        .from("wall-backgrounds")
        .getPublicUrl(path);

      const finalUrl = data.publicUrl;

      await supabase
        .from("fan_walls")
        .update({
          background_type: "image",
          background_value: finalUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", localWall.id);

      setLocalWall(prev => ({
        ...prev,
        background_type: "image",
        background_value: finalUrl,
      }));

      await refreshFanWalls?.();

    } catch (err) {
      console.error("❌ Upload Error:", err);
    } finally {
      setUploading(false);
    }
  }

  /* -------------------------------------------------------- */
  /* ✅ DELETE IMAGE */
  /* -------------------------------------------------------- */
  async function handleDeleteImage() {
    try {
      await supabase
        .from("fan_walls")
        .update({
          background_type: "gradient",
          background_value: DEFAULT_GRADIENT,
          updated_at: new Date().toISOString(),
        })
        .eq("id", localWall.id);

      setLocalWall(prev => ({
        ...prev,
        background_type: "gradient",
        background_value: DEFAULT_GRADIENT,
      }));

      await refreshFanWalls?.();

    } catch (err) {
      console.error("❌ Delete Error:", err);
    }
  }

  /* -------------------------------------------------------- */
  /* ✅ UI */
  /* -------------------------------------------------------- */
  const layoutCanonical = canonicalLayout(localWall.layout_type);
  const isSingle = layoutCanonical === 'Single Highlight Post';

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
          "relative w-full max-w-[960px] max-h-[90vh] overflow-hidden rounded-2xl",
          "border border-blue-500/30 shadow-[0_0_40px_rgba(0,140,255,0.45)]",
          "bg-gradient-to-br from-[#0b0f1a]/95 to-[#111827]/95 p-6"
        )}
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className={cn("absolute top-3 right-3 text-white/90 hover:text-white text-xl")}
        >
          ✕
        </button>

        <div className={cn("overflow-y-auto max-h-[75vh] pr-1")}>
          <h3 className={cn("text-center text-xl font-bold mb-4")}>⚙ Edit Fan Zone Wall</h3>

          <div className={cn("flex flex-col items-center gap-4 w-full")}>

            {/* PUBLIC TITLE */}
            <label className={cn('w-full', 'max-w-[520px]', 'text-sm')}>Public Title</label>
            <input
              className={cn('w-full', 'max-w-[520px]', 'p-2', 'rounded-md', 'text-black')}
              value={localWall.title || ""}
              onChange={(e) =>
                setLocalWall(prev => ({ ...prev, title: e.target.value }))
              }
            />

            {/* PRIVATE TITLE */}
            <label className={cn('w-full', 'max-w-[520px]', 'text-sm')}>Private Dashboard Title</label>
            <input
              className={cn('w-full', 'max-w-[520px]', 'p-2', 'rounded-md', 'text-black')}
              value={localWall.host_title || ""}
              onChange={(e) =>
                setLocalWall(prev => ({ ...prev, host_title: e.target.value }))
              }
            />

            {/* LAYOUT */}
            <div className={cn('w-full', 'max-w-[520px]')}>
              <label className="text-sm">Layout</label>
              <select
                className={cn('w-full', 'p-2', 'rounded', 'text-black', 'mt-1')}
                value={layoutCanonical}
                onChange={(e) =>
                  setLocalWall(prev => ({ ...prev, layout_type: e.target.value }))
                }
              >
                <option>Single Highlight Post</option>
                <option>2x2 Grid</option>
                <option>4x2 Grid</option>
              </select>
            </div>

            {/* POST TRANSITION */}
            <div className={cn('w-full', 'max-w-[520px]')}>
              <label className="text-sm">Post Transition</label>
              <select
                className={cn('w-full', 'p-2', 'rounded', 'text-black', 'mt-1')}
                value={isSingle ? (localWall.post_transition || "Fade In / Fade Out") : "Fade In / Fade Out"}
                disabled={!isSingle}
                style={{
                  opacity: !isSingle ? 0.4 : 1,
                  cursor: !isSingle ? "not-allowed" : "pointer",
                }}
                onChange={(e) =>
                  setLocalWall(prev => ({ ...prev, post_transition: e.target.value }))
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
                <option>Pop In / Pop Out</option>
              </select>
            </div>

            {/* SPEED */}
            <div className={cn('w-full', 'max-w-[520px]')}>
              <label className="text-sm">Transition Speed</label>
              <select
                className={cn('w-full', 'p-2', 'rounded', 'text-black', 'mt-1')}
                value={localWall.transition_speed}
                onChange={(e) =>
                  setLocalWall(prev => ({ ...prev, transition_speed: e.target.value }))
                }
              >
                <option>Slow</option>
                <option>Medium</option>
                <option>Fast</option>
              </select>
            </div>

            {/* COUNTDOWN */}
            <div className={cn('w-full', 'max-w-[520px]')}>
              <label className="text-sm">Countdown</label>
              <select
                className={cn('w-full', 'p-2', 'rounded', 'text-black', 'mt-1')}
                value={localWall.countdown}
                onChange={(e) =>
                  setLocalWall(prev => ({ ...prev, countdown: e.target.value }))
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
                ].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* AUTO DELETE */}
            <div className={cn('w-full', 'max-w-[520px]')}>
              <label className="text-sm">Auto-Delete (minutes)</label>
              <select
                className={cn('w-full', 'p-2', 'rounded', 'text-black', 'mt-1')}
                value={localWall.auto_delete_minutes}
                onChange={(e) =>
                  setLocalWall(prev => ({ ...prev, auto_delete_minutes: Number(e.target.value) }))
                }
              >
                <option value={0}>Disabled</option>
                {[5,10,20,30,40,50,60].map(m => (
                  <option key={m} value={m}>{m} Minutes</option>
                ))}
              </select>
            </div>

            {/* PREVIEW */}
            <div className={cn('mt-6', 'text-center')}>
              <div
                className={cn(
                  'w-[140px]',
                  'h-[80px]',
                  'rounded-md',
                  'border',
                  'border-white/20',
                  'shadow-inner',
                  'mx-auto'
                )}
                style={{
                  background:
                    localWall.background_type === "image"
                      ? `url(${localWall.background_value}) center/cover no-repeat`
                      : localWall.background_value,
                }}
              />
              <p className={cn('text-xs', 'text-gray-300', 'mt-2')}>
                {localWall.background_type === "image"
                  ? "Current Background Image"
                  : "Current Gradient Background"}
              </p>
            </div>

            {/* COLORS */}
            <div className={cn('flex', 'justify-center', 'gap-6', 'mt-4')}>
              <div>
                <label className={cn('block', 'text-xs', 'mb-1')}>Left Color</label>
                <input
                  type="color"
                  value={localWall.color_start}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const g = buildGradient(newStart, localWall.color_end, gradientPosition, brightness);
                    setLocalWall(prev => ({
                      ...prev,
                      color_start: newStart,
                      background_value: g,
                      background_type: "gradient",
                    }));
                  }}
                />
              </div>

              <div>
                <label className={cn('block', 'text-xs', 'mb-1')}>Right Color</label>
                <input
                  type="color"
                  value={localWall.color_end}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    const g = buildGradient(localWall.color_start, newEnd, gradientPosition, brightness);
                    setLocalWall(prev => ({
                      ...prev,
                      color_end: newEnd,
                      background_value: g,
                      background_type: "gradient",
                    }));
                  }}
                />
              </div>
            </div>

            {/* POSITION */}
            <div className={cn('w-full', 'flex', 'flex-col', 'items-center', 'mt-4')}>
              <label className={cn('text-xs', 'mb-1')}>Gradient Position</label>

              <div className={cn(
                'w-[140px]',
                'p-2',
                'rounded-md',
                'shadow-[0_0_15px_rgba(0,140,255,0.35)]',
                'bg-[#0f172a]/40',
                'backdrop-blur-sm'
              )}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gradientPosition}
                  onChange={(e) => {
                    const pos = Number(e.target.value);
                    setGradientPosition(pos);
                    const g = buildGradient(localWall.color_start, localWall.color_end, pos, brightness);
                    setLocalWall(prev => ({
                      ...prev,
                      gradient_pos: pos,
                      background_value: g,
                      background_type: "gradient",
                    }));
                  }}
                  className={cn('w-full', 'accent-blue-400')}
                />
              </div>

              <p className={cn('text-xs', 'mt-1')}>{gradientPosition}%</p>
            </div>

            {/* BRIGHTNESS */}
            <div className={cn('w-full', 'flex', 'flex-col', 'items-center', 'mt-4')}>
              <label className={cn('text-xs', 'mb-1')}>Background Brightness</label>

              <div className={cn(
                'w-[140px]',
                'p-2',
                'rounded-md',
                'shadow-[0_0_15px_rgba(0,140,255,0.35)]',
                'bg-[#0f172a]/40',
                'backdrop-blur-sm'
              )}>
                <input
                  type="range"
                  min="20"
                  max="150"
                  value={brightness}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBrightness(val);
                    if (localWall.background_type === "gradient") {
                      const g = buildGradient(localWall.color_start, localWall.color_end, gradientPosition, val);
                      setLocalWall(prev => ({
                        ...prev,
                        background_value: g,
                        background_brightness: val,
                      }));
                    }
                  }}
                  className={cn('w-full', 'accent-blue-400')}
                />
              </div>

              <p className={cn('text-xs', 'mt-1')}>{brightness}%</p>
            </div>

            {/* ✅✅✅ PATCHED UPLOAD SECTION ✅✅✅ */}
            <div className={cn('w-full', 'flex', 'flex-col', 'items-center', 'mt-6')}>
              <p className={cn('text-sm', 'font-semibold', 'mb-2')}>Upload Background</p>

              {/* ✅ Clean “Choose File” button */}
              <label
                htmlFor="fileUpload"
                className={cn(
                  "px-4 py-2 rounded-md",
                  "bg-blue-600 hover:bg-blue-700",
                  "text-white font-semibold",
                  "cursor-pointer text-center"
                )}
              >
                Choose File
              </label>

              {/* ✅ Hidden real file input */}
              <input
                id="fileUpload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* ✅ Filename centered */}
              <p className={cn('text-xs', 'text-gray-300', 'mt-2', 'text-center')}>
                {uploading
                  ? "Uploading..."
                  : localWall.background_type === "image"
                  ? localWall.background_value?.split('/').pop()
                  : "No file chosen"}
              </p>

              {localWall.background_type === "image" && (
                <button
                  onClick={handleDeleteImage}
                  className={cn(
                    'mt-3',
                    'bg-red-600',
                    'hover:bg-red-700',
                    'px-3',
                    'py-1',
                    'rounded',
                    'text-xs',
                    'font-semibold'
                  )}
                >
                  🗑 Delete Background Image
                </button>
              )}
            </div>

            {/* BUTTONS */}
            <div className={cn('flex', 'justify-center', 'gap-4', 'mt-6')}>
              <button
                disabled={saving}
                onClick={handleSave}
                className={cn(
                  saving ? "bg-gray-500" : "bg-green-600 hover:bg-green-700",
                  "px-4 py-2 rounded font-semibold"
                )}
              >
                {saving ? "Saving…" : "Save"}
              </button>

              <button
                onClick={onClose}
                className={cn(
                  'bg-red-600',
                  'hover:bg-red-700',
                  'px-4',
                  'py-2',
                  'rounded',
                  'font-semibold'
                )}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
