'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

interface OptionsModalFanWallProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export default function OptionsModalFanWall({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
}: OptionsModalFanWallProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localEvent, setLocalEvent] = useState<any>({ ...event });

  const [showWarning, setShowWarning] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ type: 'solid' | 'gradient'; value: string } | null>(null);

  /* ---------- BROADCAST UTILITY ---------- */
  async function broadcastEventChange() {
    try {
      await supabase.channel(`events-wall-${localEvent.id}`).send({
        type: 'broadcast',
        event: 'UPDATE',
        payload: { id: localEvent.id, updated_at: new Date().toISOString() },
      });
    } catch (err) {
      console.warn('⚠️ Broadcast failed (safe to ignore on localhost):', err);
    }
  }

  async function handleSave() {
    setSaving(true);
    const countdownValue =
      localEvent.countdown && localEvent.countdown !== 'none'
        ? String(localEvent.countdown)
        : null;

    const updates = {
      host_title: localEvent.host_title || '',
      title: localEvent.title || '',
      countdown: countdownValue,
      countdown_active: false,
      layout_type: localEvent.layout_type || 'Single Highlight Post',
      post_transition: localEvent.post_transition || '',
      transition_speed: localEvent.transition_speed || 'Medium',
      auto_delete_minutes: localEvent.auto_delete_minutes ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('events').update(updates).eq('id', localEvent.id);
    if (error) console.error('❌ Supabase update error:', error);

    await refreshEvents();
    await broadcastEventChange();
    setSaving(false);
    onClose();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Please upload a JPG, PNG, or WEBP file.');
        return;
      }

      setUploading(true);
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const ext = file.type.split('/')[1];
      const filePath = `${localEvent.id}/background-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('wall-backgrounds')
        .upload(filePath, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('wall-backgrounds').getPublicUrl(filePath);
      await supabase
        .from('events')
        .update({
          background_type: 'image',
          background_value: publicUrl.publicUrl,
          background_url: publicUrl.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localEvent.id);

      setLocalEvent({
        ...localEvent,
        background_type: 'image',
        background_value: publicUrl.publicUrl,
      });

      await refreshEvents();
      await broadcastEventChange();
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteOldImageIfExists() {
    try {
      if (localEvent.background_type !== 'image' || !localEvent.background_value) return;
      const url = localEvent.background_value;
      const parts = url.split('/wall-backgrounds/');
      if (parts.length < 2) return;
      const filePath = parts[1];
      const { error } = await supabase.storage.from('wall-backgrounds').remove([filePath]);
      if (error) console.error('⚠️ Failed to delete old image:', error);
    } catch (err) {
      console.error('❌ Error deleting old image:', err);
    }
  }

  async function handleBackgroundChange(type: 'solid' | 'gradient', value: string) {
    if (localEvent.background_type === 'image') {
      setPendingChange({ type, value });
      setShowWarning(true);
      return;
    }

    await supabase
      .from('events')
      .update({
        background_type: type,
        background_value: value,
        background_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localEvent.id);

    setLocalEvent({ ...localEvent, background_type: type, background_value: value });
    await refreshEvents();
    await broadcastEventChange();
  }

  async function confirmChange() {
    if (!pendingChange) return;
    await deleteOldImageIfExists();

    await supabase
      .from('events')
      .update({
        background_type: pendingChange.type,
        background_value: pendingChange.value,
        background_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localEvent.id);

    setLocalEvent({
      ...localEvent,
      background_type: pendingChange.type,
      background_value: pendingChange.value,
    });

    setShowWarning(false);
    setPendingChange(null);
    await refreshEvents();
    await broadcastEventChange();
  }

  function cancelChange() {
    setShowWarning(false);
    setPendingChange(null);
  }

  return (
    <>
      {/* ⚠️ Popup Warning */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gray-900 border border-yellow-500 p-6 rounded-2xl shadow-2xl text-white w-[90%] max-w-sm text-center">
            <h2 className="text-lg font-bold text-yellow-400 mb-3">Warning</h2>
            <p className="text-sm mb-5">
              Changing to a color or gradient will delete your current background image.
              You’ll need to re-upload it if you want it back.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmChange}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
              >
                Continue
              </button>
              <button
                onClick={cancelChange}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 Main Modal */}
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
        <div
          className="bg-gradient-to-br from-[#0a2540] to-[#1b2b44] border border-blue-400 p-6 rounded-2xl shadow-2xl w-96 text-white animate-fadeIn overflow-y-auto max-h-[90vh]"
          style={{ background: localEvent.background_value || DEFAULT_GRADIENT }}
        >
          <h3 className="text-center text-xl font-bold mb-3">⚙ Edit Fan Zone Wall</h3>

          {/* ---- Titles ---- */}
          <label className="block mt-2 text-sm">Title:</label>
          <input
            type="text"
            value={localEvent.host_title || ''}
            onChange={(e) => setLocalEvent({ ...localEvent, host_title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          <label className="block mt-3 text-sm">Public Title:</label>
          <input
            type="text"
            value={localEvent.title || ''}
            onChange={(e) => setLocalEvent({ ...localEvent, title: e.target.value })}
            className="w-full p-2 rounded-md text-black mt-1"
          />

          {/* ---- Countdown ---- */}
          <label className="block mt-3 text-sm">Countdown:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localEvent.countdown || 'none'}
            onChange={(e) =>
              setLocalEvent({
                ...localEvent,
                countdown: e.target.value === 'none' ? null : e.target.value,
              })
            }
          >
            <option value="none">No Countdown / Start Immediately</option>
            {[
              '30 Seconds', '1 Minute', '2 Minutes', '3 Minutes', '4 Minutes',
              '5 Minutes', '10 Minutes', '15 Minutes', '20 Minutes', '25 Minutes',
              '30 Minutes', '45 Minutes', '60 Minutes',
            ].map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          {/* ---- Layout ---- */}
          <label className="block mt-3 text-sm">Layout Type:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localEvent.layout_type || 'Single Highlight Post'}
            onChange={(e) => setLocalEvent({ ...localEvent, layout_type: e.target.value })}
          >
            <option>Single Highlight Post</option>
            <option>2 Column × 2 Row</option>
            <option>4 Column × 2 Row</option>
          </select>

          {/* ---- Post Transition ---- */}
          <label className="block mt-3 text-sm">Post Transition:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
            value={localEvent.post_transition || 'Fade In / Fade Out'}
            onChange={(e) => setLocalEvent({ ...localEvent, post_transition: e.target.value })}
            disabled={
              localEvent.layout_type === '2 Column × 2 Row' ||
              localEvent.layout_type === '4 Column × 2 Row'
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

          {(localEvent.layout_type === '2 Column × 2 Row' ||
            localEvent.layout_type === '4 Column × 2 Row') && (
            <p className="text-xs text-yellow-400 mt-1">
              Transition is fixed for multi-grid layouts.
            </p>
          )}

          {/* ---- Speed ---- */}
          <label className="block mt-3 text-sm">Transition Speed:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localEvent.transition_speed || 'Medium'}
            onChange={(e) => setLocalEvent({ ...localEvent, transition_speed: e.target.value })}
          >
            <option>Slow</option>
            <option>Medium</option>
            <option>Fast</option>
          </select>

          {/* ---- Auto Delete ---- */}
          <label className="block mt-3 text-sm">Auto Delete Posts After:</label>
          <select
            className="w-full p-2 rounded-md text-black mt-1"
            value={localEvent.auto_delete_minutes ?? 0}
            onChange={(e) =>
              setLocalEvent({
                ...localEvent,
                auto_delete_minutes: parseInt(e.target.value),
              })
            }
          >
            <option value={0}>Never (Keep All Posts)</option>
            <option value={5}>5 Minutes</option>
            <option value={10}>10 Minutes</option>
            <option value={15}>15 Minutes</option>
            <option value={20}>20 Minutes</option>
            <option value={30}>30 Minutes</option>
            <option value={45}>45 Minutes</option>
            <option value={60}>60 Minutes</option>
          </select>

          {/* ---- Background ---- */}
          <h4 className="mt-5 text-sm font-semibold">🎨 Solid Colors</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1',
              '#00897b', '#43a047', '#7cb342', '#c0ca33', '#fdd835', '#fb8c00', '#f4511e', '#6d4c41',
            ].map((c) => (
              <div
                key={c}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: c }}
                onClick={() => handleBackgroundChange('solid', c)}
              />
            ))}
          </div>

          <h4 className="mt-4 text-sm font-semibold">🌈 Gradients</h4>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {[
              'linear-gradient(135deg,#002244,#69BE28)',
              'linear-gradient(135deg,#00338D,#C60C30)',
              'linear-gradient(135deg,#203731,#FFB612)',
              'linear-gradient(135deg,#0B2265,#A71930)',
              'linear-gradient(135deg,#241773,#9E7C0C)',
              'linear-gradient(135deg,#03202F,#FB4F14)',
              'linear-gradient(135deg,#002244,#B0B7BC)',
              'linear-gradient(135deg,#002C5F,#FFC20E)',
              'linear-gradient(135deg,#E31837,#C60C30)',
              'linear-gradient(135deg,#002C5F,#A5ACAF)',
              'linear-gradient(135deg,#5A1414,#D3BC8D)',
              'linear-gradient(135deg,#4F2683,#FFC62F)',
              'linear-gradient(135deg,#A71930,#FFB612)',
              'linear-gradient(135deg,#000000,#FB4F14)',
              'linear-gradient(135deg,#004C54,#A5ACAF)',
              'linear-gradient(135deg,#A5ACAF,#0B2265)',
            ].map((g) => (
              <div
                key={g}
                className="w-5 h-5 rounded-full cursor-pointer border border-white/30 hover:scale-110 transition"
                style={{ background: g }}
                onClick={() => handleBackgroundChange('gradient', g)}
              />
            ))}
          </div>

          {/* ---- Upload ---- */}
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold mb-2">Upload Custom Background</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} />
            {uploading && <p className="text-yellow-400 text-xs mt-2 animate-pulse">Uploading...</p>}
          </div>

          {/* ---- Buttons ---- */}
          <div className="text-center mt-5 flex justify-center gap-4">
            <button
              disabled={saving}
              onClick={handleSave}
              className={`${saving ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 rounded font-semibold`}
            >
              {saving ? 'Saving…' : '💾 Save'}
            </button>
            <button onClick={onClose} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold">
              ✖ Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}