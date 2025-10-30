'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getEventsByHost } from '@/lib/actions/fan_walls';
import { getPollsByHost } from '@/lib/actions/polls';
import { getPrizeWheelsByHost } from '@/lib/actions/prizewheels';

import DashboardHeader from './components/DashboardHeader';
import CreateFanWallModal from '@/components/CreateFanWallModal';
import CreatePollModal from '@/components/CreatePollModal';
import CreatePrizeWheelModal from '@/components/CreatePrizeWheelModal';
import FanWallGrid from './components/FanWallGrid';
import PollGrid from './components/PollGrid';
import PrizeWheelGrid from './components/PrizeWheelGrid';
import OptionsModalFanWall from '@/components/OptionsModalFanWall';
import OptionsModalPoll from '@/components/OptionsModalPoll';
import OptionsModalPrizeWheel from '@/components/OptionsModalPrizeWheel';
import HostProfilePanel from '@/components/HostProfilePanel';
import { cn } from "../lib/utils";

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [wheels, setWheels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modal toggles
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPollModalOpen, setPollModalOpen] = useState(false);
  const [isPrizeWheelModalOpen, setPrizeWheelModalOpen] = useState(false);

  // Selected items for edit modals
  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<any | null>(null);
  const [selectedWheel, setSelectedWheel] = useState<any | null>(null);

  /* -------------------------------------------------------------------------- */
  /* 🧠 LOAD HOST + INITIAL DASHBOARD DATA                                     */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        // ✅ Step 1: Get current Supabase auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error(authError?.message || 'No authenticated user found.');

        // ✅ Step 2: Check if a host row exists for this auth_id
        const { data: hostRow, error: fetchError } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        let activeHost = hostRow;

        // ✅ Step 3: If no host record exists yet, create one
        if (!hostRow) {
          console.warn('⚠️ No host found, creating new entry...');
          const { data: inserted, error: insertError } = await supabase
            .from('hosts')
            .insert([
              {
                id: crypto.randomUUID(), // new host id (not auth_id)
                auth_id: user.id,
                email: user.email,
                username: user.user_metadata?.username || user.email?.split('@')[0],
                venue_name: user.user_metadata?.venue_name || 'My Venue',
                role: 'host',
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .maybeSingle();

          if (insertError) throw insertError;
          activeHost = inserted;
        }

        // ✅ Step 4: Store host in state
        setHost(activeHost);

        // ✅ Step 5: Only run data queries if we have a valid host ID
        if (!activeHost?.id) throw new Error('Host record missing ID — check host creation.');

        const [fetchedEvents, fetchedPolls, fetchedWheels] = await Promise.all([
          getEventsByHost(activeHost.id),
          getPollsByHost(activeHost.id),
          getPrizeWheelsByHost(activeHost.id),
        ]);

        setEvents(fetchedEvents);
        setPolls(fetchedPolls);
        setWheels(fetchedWheels);

      } catch (err) {
        console.error('❌ Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* -------------------------------------------------------------------------- */
  /* 🖼️ PROFILE LOGO UPLOAD (used by HostProfilePanel)                         */
  /* -------------------------------------------------------------------------- */
  async function handleLogoUpload(file: File) {
    if (!host) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('host-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('host-logos').getPublicUrl(filePath);
      const logoUrl = publicUrlData?.publicUrl;
      if (!logoUrl) throw new Error('Public URL missing');

      // ✅ Update the host’s logo URL in the DB
      const { error: updateError } = await supabase
        .from('hosts')
        .update({ logo_url: logoUrl })
        .eq('id', host.id);

      if (updateError) throw updateError;

      // ✅ Update local state immediately
      setHost((prev: any) => ({ ...prev, logo_url: logoUrl }));
    } catch (err) {
      console.error('❌ Logo upload failed:', err);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 🔁 REFRESH HELPERS                                                        */
  /* -------------------------------------------------------------------------- */
  const refreshEvents = async () => host && setEvents(await getEventsByHost(host.id));
  const refreshPolls = async () => host && setPolls(await getPollsByHost(host.id));
  const refreshPrizeWheels = async () => host && setWheels(await getPrizeWheelsByHost(host.id));

  /* -------------------------------------------------------------------------- */
  /* 🎨 BACKGROUND HANDLER                                                     */
  /* -------------------------------------------------------------------------- */
  const handleBackgroundChange = async (table: string, id: string, newValue: string) => {
    try {
      await supabase
        .from(table)
        .update({ background_value: newValue, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (error) {
      console.error(`❌ Failed to update background for ${table}:`, error);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* 🍞 TOAST HELPER                                                           */
  /* -------------------------------------------------------------------------- */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* -------------------------------------------------------------------------- */
  /* ⏳ LOADING STATE                                                          */
  /* -------------------------------------------------------------------------- */
  if (loading)
    return (
      <div className={cn('flex', 'items-center', 'justify-center', 'h-screen', 'bg-black', 'text-white')}>
        <p>Loading Dashboard…</p>
      </div>
    );

  /* -------------------------------------------------------------------------- */
  /* 🎛️ MAIN DASHBOARD UI                                                     */
  /* -------------------------------------------------------------------------- */
  return (
    <div className={cn('min-h-screen', 'bg-gradient-to-br', 'from-[#0a2540]', 'via-[#1b2b44]', 'to-black', 'text-white', 'flex', 'flex-col', 'items-center', 'p-8')}>
      {/* ---------- HEADER + PROFILE PANEL ---------- */}
      <div className={cn('w-full', 'flex', 'items-center', 'justify-between', 'mb-6')}>
        <HostProfilePanel host={host} setHost={setHost} onLogoUpload={handleLogoUpload} />
        <h1 className={cn('text-2xl', 'font-bold', 'text-center', 'flex-1')}>FanInteract Dashboard</h1>
        <div className="w-10" />
      </div>

      {/* ---------- CREATE BUTTONS ---------- */}
      <DashboardHeader
        onCreateFanWall={() => setFanWallModalOpen(true)}
        onCreatePoll={() => setPollModalOpen(true)}
        onCreatePrizeWheel={() => setPrizeWheelModalOpen(true)}
      />

      {/* ---------- FAN WALLS / POLLS / PRIZE WHEELS ---------- */}
      <FanWallGrid
        events={events}
        host={host}
        refreshEvents={refreshEvents}
        onOpenOptions={setSelectedWall}
      />
      <PollGrid
        polls={polls}
        host={host}
        refreshPolls={refreshPolls}
        onOpenOptions={setSelectedPoll}
      />
      <PrizeWheelGrid
        wheels={wheels}
        host={host}
        refreshPrizeWheels={refreshPrizeWheels}
        onOpenOptions={setSelectedWheel}
      />

      {/* ---------- CREATE MODALS ---------- */}
      <CreateFanWallModal
        isOpen={isFanWallModalOpen}
        onClose={() => setFanWallModalOpen(false)}
        hostId={host?.id}
        refreshEvents={async () => {
          await refreshEvents();
          showToast('✅ Fan Zone Wall created!');
        }}
      />
      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setPollModalOpen(false)}
        hostId={host?.id}
        refreshPolls={async () => {
          await refreshPolls();
          showToast('✅ Live Poll created!');
        }}
      />
      <CreatePrizeWheelModal
        isOpen={isPrizeWheelModalOpen}
        onClose={() => setPrizeWheelModalOpen(false)}
        hostId={host?.id}
        refreshPrizeWheels={async () => {
          await refreshPrizeWheels();
          showToast('✅ Prize Wheel created!');
        }}
      />

      {/* ---------- OPTIONS MODALS ---------- */}
      {selectedWall && (
        <OptionsModalFanWall
          event={selectedWall}
          hostId={host.id}
          onClose={() => setSelectedWall(null)}
          onBackgroundChange={async (event, val) => {
            await handleBackgroundChange('events', event.id, val);
            await refreshEvents();
            showToast('✅ Fan Wall updated!');
          }}
          refreshEvents={refreshEvents}
        />
      )}

      {selectedPoll && (
        <OptionsModalPoll
          event={selectedPoll}
          hostId={host.id}
          onClose={() => setSelectedPoll(null)}
          onBackgroundChange={async (event, val) => {
            await handleBackgroundChange('polls', event.id, val);
            await refreshPolls();
          }}
          refreshPolls={refreshPolls}
        />
      )}

      {selectedWheel && (
        <OptionsModalPrizeWheel
          event={selectedWheel}
          hostId={host.id}
          onClose={() => setSelectedWheel(null)}
          onBackgroundChange={async (wheel, val) => {
            await handleBackgroundChange('prize_wheels', wheel.id, val);
            await refreshPrizeWheels();
            showToast('✅ Prize Wheel updated!');
          }}
          refreshPrizeWheels={refreshPrizeWheels}
        />
      )}

      {/* ---------- TOAST FEEDBACK ---------- */}
      {toast && (
        <div className={cn('fixed', 'bottom-6', 'right-6', 'bg-green-600/90', 'text-white', 'px-4', 'py-2', 'rounded-lg', 'shadow-lg', 'animate-fadeIn', 'z-50')}>
          {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
