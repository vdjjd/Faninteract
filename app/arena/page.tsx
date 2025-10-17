'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
}

export default function ArenaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});

  useEffect(() => {
    const gameId = 'demo-room';
    const channel = supabase.channel(gameId);

    channel.on('broadcast', { event: 'player-input' }, ({ payload }) => {
      setPlayers((prev) => {
        const player = prev[payload.playerId] || {
          id: payload.playerId,
          x: Math.random() * 800,
          y: Math.random() * 600,
          angle: 0,
        };

        if (payload.action === 'LEFT') player.angle -= 0.1;
        if (payload.action === 'RIGHT') player.angle += 0.1;
        if (payload.action === 'THRUST') {
          player.x += Math.cos(player.angle) * 5;
          player.y += Math.sin(player.angle) * 5;
        }

        return { ...prev, [payload.playerId]: player };
      });
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      Object.values(players).forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-10, -6);
        ctx.lineTo(-10, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      requestAnimationFrame(draw);
    };

    draw();
  }, [players]);

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <h1 className="text-2xl mb-4">🚀 FanInteract Battle Arena</h1>
      <canvas ref={canvasRef} width={800} height={600} className="border border-blue-500" />
    </main>
  );
}
