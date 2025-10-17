'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ControllerPage() {
  const [playerId] = useState(() => crypto.randomUUID());
  const [gameId] = useState('demo-room');

  async function sendInput(action: string) {
    await supabase.channel(gameId).send({
      type: 'broadcast',
      event: 'player-input',
      payload: { playerId, action },
    });
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-black text-white space-y-4">
      <h1 className="text-2xl font-bold mb-4">🚀 FanInteract Battle Controller</h1>

      <div className="flex flex-wrap justify-center gap-4">
        <button onClick={() => sendInput('THRUST')} className="bg-blue-600 px-6 py-3 rounded-lg">⬆️ Thrust</button>
        <button onClick={() => sendInput('LEFT')} className="bg-gray-600 px-6 py-3 rounded-lg">⬅️ Left</button>
        <button onClick={() => sendInput('RIGHT')} className="bg-gray-600 px-6 py-3 rounded-lg">Right ➡️</button>
        <button onClick={() => sendInput('FIRE')} className="bg-red-600 px-6 py-3 rounded-lg">🔫 Fire</button>
        <button onClick={() => sendInput('SHIELD')} className="bg-cyan-600 px-6 py-3 rounded-lg">🛡️ Shield</button>
      </div>
    </main>
  );
}
