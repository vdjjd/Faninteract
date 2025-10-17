'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  shield: number;
  cooldown: number;
  hyperCount?: number;
}

interface Laser {
  id: string;
  x: number;
  y: number;
  angle: number;
  owner: string;
}

interface Asteroid {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  radius: number;
}

export default function ArenaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);

  // 🌐 Supabase Realtime
  useEffect(() => {
    const gameId = 'demo-room';
    const channel = supabase.channel(gameId);

    channel.on('broadcast', { event: 'player-input' }, ({ payload }) => {
      setPlayers((prev) => {
        const player = prev[payload.playerId] || {
          id: payload.playerId,
          x: Math.random() * 1920,
          y: Math.random() * 1080,
          vx: 0,
          vy: 0,
          angle: 0,
          shield: 100,
          cooldown: 0,
          hyperCount: 0,
        };

        // 🔄 Turning
        if (payload.action === 'LEFT') player.angle -= 0.1;
        if (payload.action === 'RIGHT') player.angle += 0.1;

        // 🚀 Thrust (adds to velocity, not direct movement)
        if (payload.action === 'THRUST') {
          const thrustPower = 0.4;
          player.vx += Math.cos(player.angle) * thrustPower;
          player.vy += Math.sin(player.angle) * thrustPower;
        }

        // ✨ Hyperspace (max 3)
        if (payload.action === 'HYPERSPACE') {
          if (player.hyperCount === undefined) player.hyperCount = 0;
          if (player.hyperCount < 3) {
            player.x = Math.random() * 1920;
            player.y = Math.random() * 1080;
            player.vx = 0;
            player.vy = 0;
            player.hyperCount++;
          }
        }

        // 🔫 Fire laser
        if (payload.action === 'FIRE' && player.cooldown <= 0 && player.shield > 0) {
          setLasers((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              x: player.x,
              y: player.y,
              angle: player.angle,
              owner: player.id,
            },
          ]);
          player.cooldown = 20;
        }

        player.cooldown = Math.max(0, player.cooldown - 1);
        return { ...prev, [player.id]: player };
      });
    });

    channel.subscribe();

    // ☄️ Create asteroids
    const newAsteroids: Asteroid[] = [];
    for (let i = 0; i < 6; i++) {
      newAsteroids.push({
        id: crypto.randomUUID(),
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        hp: 10000,
        radius: 80 + Math.random() * 60,
      });
    }
    setAsteroids(newAsteroids);

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // 🕹️ Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function loop() {
      if (!ctx) return;

      // Clear
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 1920, 1080);

      // 🪨 Move asteroids
      setAsteroids((prev) =>
        prev.map((a) => {
          let x = a.x + a.vx;
          let y = a.y + a.vy;

          if (x < 0 || x > 1920) a.vx *= -1;
          if (y < 0 || y > 1080) a.vy *= -1;

          ctx.beginPath();
          ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#333';
          ctx.fill();

          return { ...a, x, y };
        })
      );

      // 🔫 Move lasers
      setLasers((prev) =>
        prev
          .map((l) => ({
            ...l,
            x: l.x + Math.cos(l.angle) * 10,
            y: l.y + Math.sin(l.angle) * 10,
          }))
          .filter((l) => l.x >= 0 && l.x <= 1920 && l.y >= 0 && l.y <= 1080)
      );

      // Draw lasers
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      lasers.forEach((l) => {
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x - Math.cos(l.angle) * 10, l.y - Math.sin(l.angle) * 10);
        ctx.stroke();
      });

      // 🧠 Update player positions (inertia physics)
      setPlayers((prev) => {
        const updated = { ...prev };
        for (const id in updated) {
          const p = updated[id];

          // apply velocity
          p.x += p.vx;
          p.y += p.vy;

          // Wrap screen edges
          if (p.x < 0) p.x = 1920;
          if (p.x > 1920) p.x = 0;
          if (p.y < 0) p.y = 1080;
          if (p.y > 1080) p.y = 0;

          // slow down slightly (space friction)
          p.vx *= 0.995;
          p.vy *= 0.995;
        }
        return updated;
      });

      // 💥 Laser hits
      Object.values(players).forEach((p) => {
        Object.values(players).forEach((target) => {
          if (p.id !== target.id) {
            lasers.forEach((l) => {
              if (l.owner === p.id) {
                const dx = l.x - target.x;
                const dy = l.y - target.y;
                if (Math.sqrt(dx * dx + dy * dy) < 25) {
                  target.shield = Math.max(0, target.shield - 10);
                }
              }
            });
          }
        });
      });

      // 🚀 Draw players (2× size)
      Object.values(players).forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.shield > 0 ? '#00ffff' : '#ff3333';
        ctx.beginPath();
        ctx.moveTo(30, 0); // 🔺 twice as big
        ctx.lineTo(-20, -14);
        ctx.lineTo(-20, 14);
        ctx.closePath();
        ctx.fill();

        // Shield ring
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,255,${p.shield / 100})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
      });

      requestAnimationFrame(loop);
    }

    loop();
  }, [players, lasers, asteroids]);

  // 🎨 Canvas Layout
  return (
    <main className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="border border-blue-600 rounded-lg"
        style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9' }}
      />
    </main>
  );
}
