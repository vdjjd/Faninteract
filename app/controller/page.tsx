'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ControllerPage() {
  const [isHeld, setIsHeld] = useState(false);
  const [playerId, setPlayerId] = useState<string>(() => crypto.randomUUID());

  function sendInput(action: string) {
    supabase.channel('demo-room').send({
      type: 'broadcast',
      event: 'player-input',
      payload: { playerId, action },
    });
  }

  // Handle thrust hold vs tap
  useEffect(() => {
    let holdInterval: NodeJS.Timeout | null = null;
    if (isHeld) {
      holdInterval = setInterval(() => sendInput('THRUST_HELD'), 100);
    }
    return () => {
      if (holdInterval) clearInterval(holdInterval);
    };
  }, [isHeld]);

  // 🌌 Basic canvas setup for controller feedback (if you added one)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    function draw() {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0ff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Controller Connected', canvas.width / 2, canvas.height / 2);
      requestAnimationFrame(draw);
    }

    draw();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <h1 className="text-3xl font-bold mb-4">Ship Controller</h1>

      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={() => sendInput('LEFT')}
          className="rounded-full bg-blue-700 hover:bg-blue-600 px-6 py-4 text-lg font-semibold transition"
        >
          ⬅️ Left
        </button>

        <button
          onClick={() => sendInput('RIGHT')}
          className="rounded-full bg-blue-700 hover:bg-blue-600 px-6 py-4 text-lg font-semibold transition"
        >
          ➡️ Right
        </button>

        <button
          onMouseDown={() => setIsHeld(true)}
          onMouseUp={() => setIsHeld(false)}
          onTouchStart={() => setIsHeld(true)}
          onTouchEnd={() => setIsHeld(false)}
          onClick={() => sendInput('THRUST_TAP')}
          className="rounded-full bg-green-700 hover:bg-green-600 px-6 py-4 text-lg font-semibold transition"
        >
          🚀 Thrust
        </button>

        <button
          onClick={() => sendInput('FIRE')}
          className="rounded-full bg-red-700 hover:bg-red-600 px-6 py-4 text-lg font-semibold transition"
        >
          🔫 Fire
        </button>

        <button
          onClick={() => sendInput('HYPERSPACE')}
          className="rounded-full bg-purple-700 hover:bg-purple-600 px-6 py-4 text-lg font-semibold transition"
        >
          ✨ Hyperspace
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="border border-blue-500 rounded-md"
      />
    </main>
  );
}
