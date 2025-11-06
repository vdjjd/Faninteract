'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getFanWallsByHost } from '@/lib/actions/fan_walls';

import DashboardHeader from './components/DashboardHeader';
import FanWallGrid from './components/FanWallGrid';
import CreateFanWallModal from '@/components/CreateFanWallModal';
import OptionsModalFanWall from '@/components/OptionsModalFanWall';
import AdsManagerModal from '@/components/AdsManagerModal'; // ✅ new modal import
import HostProfilePanel from '@/components/HostProfilePanel';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const supabase = getSupabaseClient();

  const [host, setHost] = useState<any>(null);
  const [fanWalls, setFanWalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  const [isAdsModalOpen, setAdsModalOpen] = useState(false); // ✅ NEW STATE

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
        }
      } catch (err: any) {
        console.error('❌ Error loading dashboard data:', err.message || err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  const refreshFanWalls = async () => {
    if (host?.id) {
      const updated = await getFanWallsByHost(host.id);
      setFanWalls(updated);
    }
  };

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
        onCreatePrizeWheel={() => {}}
        onOpenAds={() => setAdsModalOpen(true)} // ✅ Opens the Ads modal
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

      {/* ---------- ADS MANAGER MODAL ---------- */}
      {isAdsModalOpen && (
        <AdsManagerModal
          host={host}
          onClose={() => setAdsModalOpen(false)} // ✅ close button + outside click
        />
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
