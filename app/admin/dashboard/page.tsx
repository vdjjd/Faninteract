'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient'; // ✅ use runtime getter
import { getFanWallsByHost } from '@/lib/actions/fan_walls';

import DashboardHeader from './components/DashboardHeader';
import FanWallGrid from './components/FanWallGrid';
import CreateFanWallModal from '@/components/CreateFanWallModal';
import OptionsModalFanWall from '@/components/OptionsModalFanWall';
import HostProfilePanel from '@/components/HostProfilePanel';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const supabase = getSupabaseClient(); // ✅ safely created at runtime

  const [host, setHost] = useState<any>(null);
  const [fanWalls, setFanWalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [selectedWall, setSelectedWall] = useState<any | null>(null);

  /* ---------------------------------------------------------------------- */
  /* 🔹 Load initial data                                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        if (!supabase) throw new Error('Supabase client unavailable.');

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');

        // 🔍 Fetch or create host profile
        let { data: hostRow, error: hostError } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (hostError) throw hostError;

        if (!hostRow) {
          const { data: inserted, error: insertError } = await supabase
            .from('hosts')
            .insert([
              {
                id: crypto.randomUUID(),
                auth_id: user.id,
                email: user.email,
                username:
                  user.user_metadata?.username || user.email?.split('@')[0],
                venue_name:
                  user.user_metadata?.venue_name || 'My Venue',
                role: 'host',
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .maybeSingle();

          if (insertError) throw insertError;
          hostRow = inserted;
        }

        setHost(hostRow);

        if (hostRow?.id) {
          const fetchedWalls = await getFanWallsByHost(hostRow.id);
          setFanWalls(fetchedWalls);
        }
      } catch (err: any) {
        console.error('❌ Error loading dashboard data:', err.message || err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  /* ---------------------------------------------------------------------- */
  /* 🔁 Refresh function                                                   */
  /* ---------------------------------------------------------------------- */
  const refreshFanWalls = async () => {
    if (host?.id) {
      const updated = await getFanWallsByHost(host.id);
      setFanWalls(updated);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 📡 Realtime wall status listener                                      */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!supabase || !host?.id) return;

    const channel = supabase
      .channel('global-fan-walls')
      .on('broadcast', { event: 'wall_status_changed' }, (payload) => {
        const { id, status } = payload?.payload || {};
        if (!id) return;

        console.log('📡 Realtime wall update:', id, status);

        setFanWalls((prev) =>
          prev.map((w) => (w.id === id ? { ...w, status } : w))
        );

        refreshFanWalls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host, supabase]);

  /* ---------------------------------------------------------------------- */
  /* 🕓 Loading State                                                      */
  /* ---------------------------------------------------------------------- */
  if (loading)
    return (
      <div
        className={cn(
          'flex',
          'items-center',
          'justify-center',
          'h-screen',
          'bg-black',
          'text-white'
        )}
      >
        <p>Loading Dashboard…</p>
      </div>
    );

  /* ---------------------------------------------------------------------- */
  /* 🧱 Render Dashboard                                                   */
  /* ---------------------------------------------------------------------- */
  return (
    <div
      className={cn(
        'min-h-screen',
        'bg-[#0b111d]',
        'text-white',
        'flex',
        'flex-col',
        'items-center',
        'p-8'
      )}
    >
      {/* ---------- HEADER ---------- */}
      <div
        className={cn(
          'w-full',
          'flex',
          'items-center',
          'justify-between',
          'mb-6'
        )}
      >
        <HostProfilePanel host={host} setHost={setHost} />
        <h1 className={cn('text-2xl', 'font-bold', 'flex-1', 'text-center')}>
          FanInteract Dashboard
        </h1>
        <div className="w-10" />
      </div>

      {/* ---------- CREATE BUTTONS ---------- */}
      <DashboardHeader
        onCreateFanWall={() => setFanWallModalOpen(true)}
        onCreatePoll={() => {}}
        onCreatePrizeWheel={() => {}}
      />

      {/* ---------- FAN ZONE WALLS ---------- */}
      <FanWallGrid
        walls={fanWalls}
        host={host}
        refreshFanWalls={refreshFanWalls}
        onOpenOptions={setSelectedWall}
      />

      {/* ---------- CREATE MODAL ---------- */}
      <CreateFanWallModal
        isOpen={isFanWallModalOpen}
        onClose={() => setFanWallModalOpen(false)}
        hostId={host?.id}
        refreshFanWalls={refreshFanWalls}
      />

      {/* ---------- OPTIONS MODAL ---------- */}
      {selectedWall && (
        <OptionsModalFanWall
          wall={selectedWall}
          hostId={host?.id}
          onClose={() => setSelectedWall(null)}
          refreshFanWalls={refreshFanWalls}
        />
      )}
    </div>
  );
}
