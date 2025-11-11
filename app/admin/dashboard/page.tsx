'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getFanWallsByHost } from '@/lib/actions/fan_walls';

import DashboardHeader from './components/DashboardHeader';
import FanWallGrid from './components/FanWallGrid';
import PrizeWheelGrid from './components/PrizeWheelGrid';

import CreateFanWallModal from '@/components/CreateFanWallModal';
import CreatePrizeWheelModal from '@/components/CreatePrizeWheelModal';
import OptionsModalFanWall from '@/components/OptionsModalFanWall';
import OptionsModalPrizeWheel from '@/components/OptionsModalPrizeWheel';   
import AdsManagerModal from '@/components/AdsManagerModal';
import HostProfilePanel from '@/components/HostProfilePanel';

import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const supabase = getSupabaseClient();

  const [host, setHost] = useState<any>(null);

  const [fanWalls, setFanWalls] = useState<any[]>([]);
  const [prizeWheels, setPrizeWheels] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPrizeWheelModalOpen, setPrizeWheelModalOpen] = useState(false);
  const [isAdsModalOpen, setAdsModalOpen] = useState(false);

  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  const [selectedPrizeWheel, setSelectedPrizeWheel] = useState<any | null>(null);

  /* ------------------------------------------------------- */
  /* ✅ INITIAL LOAD */
  /* ------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error('No authenticated user');

        let { data: hostRow } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (!hostRow) {
          const { data: inserted } = await supabase
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

          hostRow = inserted;
        }

        setHost(hostRow);

        if (hostRow?.id) {
          const fetchedWalls = await getFanWallsByHost(hostRow.id);
          setFanWalls(fetchedWalls);

          const { data: wheels } = await supabase
            .from('prize_wheels')
            .select('*')
            .eq('host_id', hostRow.id)
            .order('created_at', { ascending: false });

          setPrizeWheels(wheels || []);
        }
      } catch (err: any) {
        console.error('❌ Dashboard load error:', err.message || err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  /* ------------------------------------------------------- */
  /* ✅ REALTIME AUTO-REFRESH FOR PRIZE WHEEL ENTRIES */
  /* ------------------------------------------------------- */
  useEffect(() => {
    if (!host?.id) return;

    const channel = supabase
      .channel('prizewheel-dashboard-sync')
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'wheel_entries',
          event: '*',
        },
        async (payload) => {
          console.log('🔄 PrizeWheel Dashboard Realtime Refresh:', payload);
          const { data } = await supabase
            .from('prize_wheels')
            .select('*')
            .eq('host_id', host.id)
            .order('created_at', { ascending: false });

          setPrizeWheels(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host?.id, supabase]);

  /* ------------------------------------------------------- */
  /* ✅ POLLING (EVERY 3 SECONDS) — ALWAYS KEEP WHEELS FRESH */
  /* ------------------------------------------------------- */
  useEffect(() => {
    if (!host?.id) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('prize_wheels')
        .select('*')
        .eq('host_id', host.id)
        .order('created_at', { ascending: false });

      setPrizeWheels(data || []);
    }, 3000);

    return () => clearInterval(interval);
  }, [host?.id]);

  /* ------------------------------------------------------- */
  /* ✅ REFRESH HELPERS */
  /* ------------------------------------------------------- */
  const refreshFanWalls = async () => {
    if (!host?.id) return;
    const updated = await getFanWallsByHost(host.id);
    setFanWalls(updated);
  };

  const refreshPrizeWheels = async () => {
    if (!host?.id) return;

    const { data } = await supabase
      .from('prize_wheels')
      .select('*')
      .eq('host_id', host.id)
      .order('created_at', { ascending: false });

    setPrizeWheels(data || []);
  };

  /* ------------------------------------------------------- */
  /* ✅ RENDER */
  /* ------------------------------------------------------- */
  if (loading)
    return (
      <div className={cn('flex items-center justify-center h-screen bg-black text-white')}>
        <p>Loading Dashboard…</p>
      </div>
    );

  return (
    <div className={cn('min-h-screen bg-[#0b111d] text-white flex flex-col items-center p-8')}>
      
      {/* ---------- HEADER ---------- */}
      <div className={cn('w-full flex items-center justify-between mb-6')}>
        <HostProfilePanel host={host} setHost={setHost} />
        <div className="w-10" />
      </div>

      {/* ---------- CREATE BUTTONS ---------- */}
      <DashboardHeader
        onCreateFanWall={() => setFanWallModalOpen(true)}
        onCreatePoll={() => {}}
        onCreatePrizeWheel={() => setPrizeWheelModalOpen(true)}
        onOpenAds={() => setAdsModalOpen(true)}
      />

      {/* ---------- FAN WALLS ---------- */}
      <FanWallGrid
        walls={fanWalls}
        host={host}
        refreshFanWalls={refreshFanWalls}
        onOpenOptions={setSelectedWall}
      />

      {/* ---------- PRIZE WHEELS ---------- */}
      <PrizeWheelGrid
        wheels={prizeWheels}
        host={host}
        refreshPrizeWheels={refreshPrizeWheels}
        onOpenOptions={setSelectedPrizeWheel}
      />

      {/* ---------- FAN WALL CREATE ---------- */}
      <CreateFanWallModal
        isOpen={isFanWallModalOpen}
        onClose={() => setFanWallModalOpen(false)}
        hostId={host?.id}
        refreshFanWalls={refreshFanWalls}
      />

      {/* ---------- PRIZE WHEEL CREATE ---------- */}
      <CreatePrizeWheelModal
        isOpen={isPrizeWheelModalOpen}
        onClose={() => setPrizeWheelModalOpen(false)}
        hostId={host?.id}
        refreshPrizeWheels={refreshPrizeWheels}
      />

      {/* ---------- FAN WALL OPTIONS ---------- */}
      {selectedWall && (
        <OptionsModalFanWall
          wall={selectedWall}
          hostId={host?.id}
          onClose={() => setSelectedWall(null)}
          refreshFanWalls={refreshFanWalls}
        />
      )}

      {/* ✅ PRIZE WHEEL OPTIONS */}
      {selectedPrizeWheel && (
        <OptionsModalPrizeWheel
          event={selectedPrizeWheel}
          hostId={host?.id}
          onClose={() => setSelectedPrizeWheel(null)}
          refreshPrizeWheels={refreshPrizeWheels}
        />
      )}

      {/* ---------- ADS MANAGER ---------- */}
      {isAdsModalOpen && (
        <AdsManagerModal
          host={host}
          onClose={() => setAdsModalOpen(false)}
        />
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
