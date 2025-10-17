'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ControllerPage() {
  const [playerId] = useState(() => crypto.randomUUID());
  const [gameId] = useState('demo-room');
  const [hyperUses, setHyperUses] = useState(3);
  const thrustInterval = useRef<NodeJS.Timeout | null>(null);

  async function sendInput(action: string) {
    await supabase.channel(gameId).send({
      type: 'broadcast',
      event: 'player-input',
      payload: { playerId, action },
    });
  }

  const buttonClass =
    "w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-lg md:text-2xl font-bold text-white shadow-lg transition-transform active:scale-90";

  // Tap = one short burst
  async function handleTap() {
    await sendInput('THRUST_TAP');
  }

  // Hold = continuous thrust while pressed
  function handleThrustHoldStart() {
    if (thrustInterval.current) return;
    thrustInterval.current = setInterval(() => sendInput('THRUST_HELD'), 100);
  }

  function handleThrustHoldEnd() {
    if (thrustInterval.current) {
      clearInterval(thrustInterval.current);
      thrustInterval.current = null;
    }
  }

  async function handleHyperspace() {
    if (hyperUses > 0) {
      setHyperUses(hyperUses - 1);
      await sendInput('HYPERSPACE');
    }
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#0a2540] to-black text-white space-y-8 select-none">
      <h1 className="text-2xl font-bold mb-2">🚀 FanInteract Controller</h1>

      <div className="flex flex-wrap justify-center gap-6">
        <button onClick={() => sendInput('LEFT')} className={`${buttonClass} bg-gray-600`}>⬅️</button>

        <button
          onClick={handleTap}
          onMouseDown={handleThrustHoldStart}
          onMouseUp={handleThrustHoldEnd}
