'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
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
  radius: number;
  hp: number;
  rotation: number;
  spin: number;
}

export default function ArenaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [lasers, setLasers] = useState<Laser[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);

  // 🌐 Supabase Realtime (no async/await now)
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

        const rotSpeed = 0.06;
        if (payload.action === 'LEFT') player.angle -= rotSpeed;
        if (payload.action === 'RIGHT') player.angle += rotSpeed;

        // 🚀 Tap vs Hold Thrust
        if (payload.action === 'THRUST_TAP') {
          const thrustPower = 0.04;
          player.vx += Math.cos(player.angle) * thrustPower;
          player.vy += Math.sin(player.angle) * thrustPower;
        }
        if (payload.action === 'THRUST_HELD') {
          const thrustPower = 0.08;
          player.vx += Math.cos(player.angle) * thrustPower;
          player.vy += Math.sin(player.angle) * thrustPower;
        }

        // ✨ Hyperspace
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

        // 🔫 Fire
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

    // ✅ subscribe immediately (no await)
    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // ☄️ Create drifting asteroids once
  useEffect(() => {
    const list: Asteroid[] = [];
    for (let i = 0; i < 8; i++) {
      list.push({
        id: crypto.randomUUID(),
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: 60 + Math.random() * 60,
        hp: 10000,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.01,
      });
    }
    asteroidsRef.current = list;
  }, []);

  // 🕹️ Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function loop() {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 1920, 1080);

      const asteroids = asteroidsRef.current;

      // 🌑 Move & Draw Asteroids
      for (const a of asteroids) {
        a.x += a.vx;
        a.y += a.vy;
        a.rotation += a.spin;

        // Wrap screen edges
        if (a.x < -a.radius) a.x = 1920 + a.radius;
        if (a.x > 1920 + a.radius) a.x = -a.radius;
        if (a.y < -a.radius) a.y = 1080 + a.radius;
        if (a.y > 1080 + a.radius) a.y = -a.radius;

        // Draw asteroid
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const r = a.radius * (0.7 + Math.random() * 0.3);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#444';
        ctx.fill();
        ctx.restore();
      }

      // 🔫 Move & Draw Lasers
      setLasers((prev) =>
        prev
          .map((l) => ({
            ...l,
            x: l.x + Math.cos(l.angle) * 10,
            y: l.y + Math.sin(l.angle) * 10,
          }))
          .filter((l) => l.x >= 0 && l.x <= 1920 && l.y >= 0 && l.y <= 1080)
      );

      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      lasers.forEach((l) => {
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x - Math.cos(l.angle) * 10, l.y - Math.sin(l.angle) * 10);
        ctx.stroke();
      });

      // 🚀 Move Players
      setPlayers((prev) => {
        const updated = { ...prev };
        for (const id in updated) {
          const p = updated[id];
          p.x += p.vx;
          p.y += p.vy;

          // Wrap edges
          if (p.x < 0) p.x = 1920;
          if (p.x > 1920) p.x = 0;
          if (p.y < 0) p.y = 1080;
          if (p.y > 1080) p.y = 0;

          // Zero-G drift (tiny friction)
          p.vx *= 0.995;
          p.vy *= 0.995;
        }
        return updated;
      });

      // 🧑‍🚀 Draw Players
      Object.values(players).forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.shield > 0 ? '#00ffff' : '#ff3333';
        ctx.beginPath();
        ctx.moveTo(30, 0);
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
  }, [players, lasers]);

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
