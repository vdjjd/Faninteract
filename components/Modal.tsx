'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabaseClient';

interface OptionsModalProps {
  event: any;
  hostId: string;
  onClose: () => void;
  onBackgroundChange: (event: any, newValue: string) => void;
  refreshEvents: () => void;
}

export default function OptionsModal({
  event,
  hostId,
  onClose,
  onBackgroundChange,
  refreshEvents,
}: OptionsModalProps) {
  const [backgroundType, setBackgroundType] = useState(
    event.background_type || 'gradient'
  );
  const [backgroundValue, setBackgroundValue] = useState(
    event.background_value || 'linear-gradient(135deg,#0d47a1,#1976d2)'
  );
  const [logoUrl, setLogoUrl] = useState(event.logo_url || '');
  const [countdown, setCountdown] = useState(event.countdown || '');
  const [saving, setSaving] = useState(false);

  const countdownOptions = [
    '15 Seconds',
    '30 Seconds',
    '1 Minute',
    '2 Minutes',
    '3 Minutes',
    '5 Minutes',
    '10 Minutes',
  ];

  async function handleSave() {
    setSaving(true);
    await supabase
      .from('events')
      .update({
        background_type: backgroundType,
        background_value: backgroundValue,
        logo_url: logoUrl || null,
        countdown: countdown || null,
        countdown_active: false, // ⬅ ensures timer visible but not running
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);

    onBackgroundChange(event, backgroundValue);
    await refreshEvents();
    setSaving(false);
    onClose();
  }

  return (
    <Modal isOpen={!!event} onClose={onClose}>
      <h2 className="text-2xl font-bold text-white text-center mb-4">
        ⚙ Wall Options
      </h2>

      {/* ---------- BACKGROUND TYPE ---------- */}
      <label className="block text-gray-300 text-sm font-semibold mt-3">
        Background Type
      </label>
      <select
        value={backgroundType}
        onChange={(e) => setBackgroundType(e.target.value)}
        className="w-full bg-black/40 border border-gray-600 text-white rounded-md p-2 mt-1"
      >
        <option value="gradient">Gradient</option>
        <option value="solid">Solid Color</option>
        <option value="image">Image URL</option>
      </select>

      {/* ---------- BACKGROUND VALUE ---------- */}
      {backgroundType === 'gradient' && (
        <div className="mt-2">
          <label className="block text-gray-300 text-sm mb-1">
            Choose Gradient
          </label>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'linear-gradient(135deg,#ff416c,#ff4b2b)',
              'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)',
              'linear-gradient(135deg,#00c6ff,#0072ff)',
              'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
              'linear-gradient(135deg,#fc466b,#3f5efb)',
              'linear-gradient(135deg,#4dc6ff,#001f4d)',
            ].map((g) => (
              <div
                key={g}
                onClick={() => setBackgroundValue(g)}
                className="w-10 h-10 rounded-full cursor-pointer border-2 border-white/40"
                style={{ background: g }}
              ></div>
            ))}
          </div>
        </div>
      )}

      {backgroundType === 'solid' && (
        <input
          type="color"
          value={backgroundValue}
          onChange={(e) => setBackgroundValue(e.target.value)}
          className="w-full h-10 mt-2 rounded-md cursor-pointer"
        />
      )}

      {backgroundType === 'image' && (
        <input
          type="text"
          placeholder="Enter image URL"
          value={backgroundValue}
          onChange={(e) => setBackgroundValue(e.target.value)}
          className="w-full bg-black/40 border border-gray-600 text-white rounded-md p-2 mt-2"
        />
      )}

      {/* ---------- LOGO URL ---------- */}
      <label className="block text-gray-300 text-sm font-semibold mt-4">
        Logo URL
      </label>
      <input
        type="text"
        placeholder="Enter logo URL"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        className="w-full bg-black/40 border border-gray-600 text-white rounded-md p-2 mt-1"
      />

      {/* ---------- COUNTDOWN SELECT ---------- */}
      <label className="block text-gray-300 text-sm font-semibold mt-4">
        Countdown Timer
      </label>
      <select
        value={countdown}
        onChange={(e) => setCountdown(e.target.value)}
        className="w-full bg-black/40 border border-gray-600 text-white rounded-md p-2 mt-1"
      >
        <option value="">No Timer</option>
        {countdownOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {/* ---------- SAVE BUTTON ---------- */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md mt-6 transition-all"
      >
        {saving ? 'Saving...' : '💾 Save Settings'}
      </button>
    </Modal>
  );
}
