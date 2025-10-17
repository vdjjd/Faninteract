'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ControllerPage() {
  const [playerId] = useState(() => crypto.randomUUID());
  const [gameId] = useState('demo-room');
  const [hyperUses, setHyperUses] = useState(3); // 🚀 Limit to 3 uses

  async function sendInput(action: string) {
    await supabase.channel(gameId).send({
      type: 'broadcast',
      event: 'player-input',
      payload: { playerId, action },
    });
  }

  const buttonClass =
    "w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-lg md:text-2xl font-bold text-white shadow-lg transition-transform active:scale-90";

  async function handleHyperspace() {
    if (hyperUses > 0) {
      setHyperUses(hyperUses - 1);
      await sendInput('HYPERSPACE');
    }
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#0a2540] to-black text-white space-y-8">
      <h1 className="text-2xl font-bold mb-2">🚀 FanInteract Controller</h1>

      <div className="flex flex-wrap justify-center gap-6">
        <button onClick={() => sendInput('LEFT')} className={`${buttonClass} bg-gray-600`}>⬅️</button>
        <button onClick={() => sendInput('THRUST')} className={`${buttonClass} bg-blue-600`}>⬆️</button>
        <button onClick={() => sendInput('RIGHT')} className={`${buttonClass} bg-gray-600`}>➡️</button>
        <button onClick={() => sendInput('FIRE')} className={`${buttonClass} bg-red-600`}>🔫</button>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleHyperspace}
          disabled={hyperUses <= 0}
          className={`${buttonClass} ${hyperUses > 0 ? 'bg-purple-600' : 'bg-gray-800 opacity-50 cursor-not-allowed'}`}
        >
          ✨
        </button>
      </div>

      <p className="text-sm text-gray-400">
        Hyperspace uses left: {hyperUses}
      </p>
    </main>
  );
}
