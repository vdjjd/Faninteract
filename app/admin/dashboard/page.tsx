'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getEventsByHost } from '@/lib/actions/events';
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

export default function DashboardPage() {
  /* -------------------------------------------------------------------------- */
  /* 📦 STATE                                                                  */
  /* -------------------------------------------------------------------------- */
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [wheels, setWheels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPollModalOpen, setPollModalOpen] = useState(false);
  const [isPrizeWheelModalOpen, setPrizeWheelModalOpen] = useState(false);

  // Selected Items
  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<any | null>(null);
  const [selectedWheel, setSelectedWheel] = useState<any | null>(null);

  /* -------------------------------------------------------------------------- */
  /* 🧠 LOAD HOST + INITIAL DATA                                                */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error(authError?.message || 'No user');

        const { data: hostRow } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        let activeHost = hostRow;

        // Auto-create host if missing
        if (!hostRow) {
          const { data: newHost, error: insertError } = await supabase
            .from('hosts')
            .insert([
              {
                auth_id: user.id,
                email: user.email,
                username: user.user_metadata?.username || user.email?.split('@')[0],
                first_name: user.user_metadata?.first_name || null,
                last_name: user.user_metadata?.last_name || null,
              },
            ])
            .select()
            .maybeSingle();

          if (insertError) throw insertError;
          console.log('🆕 Auto-created host record for', user.email);
          activeHost = newHost;
        }

        if (!activeHost) throw new Error('No valid host found');

        setHost(activeHost);

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
  /* 🖼️ PROFILE LOGO UPLOAD                                                    */
  /* -------------------------------------------------------------------------- */
  async function handleLogoUpload(file: File) {
    if (!host) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('host-logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('host-logos')
        .getPublicUrl(filePath);
      const logoUrl = publicUrlData?.publicUrl;
      if (!logoUrl) throw new Error('No public URL generated');

      const { error: updateError } = await supabase
        .from('hosts')
        .update({ logo_url: logoUrl })
        .eq('id', host.id);
      if (updateError) throw updateError;

      setHost((prev: any) => ({ ...prev, logo_url: logoUrl }));
      console.log('✅ Profile logo uploaded successfully:', logoUrl);
    } catch (err) {
      console.error('❌ Upload error:', err);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 🔄 REFRESH HELPERS                                                         */
  /* -------------------------------------------------------------------------- */
  const refreshEvents = async () => host && setEvents(await getEventsByHost(host.id));
  const refreshPolls = async () => host && setPolls(await getPollsByHost(host.id));
  const refreshWheels = async () => host && setWheels(await getPrizeWheelsByHost(host.id));

  /* -------------------------------------------------------------------------- */
  /* 📡 REALTIME SYNC (Fan Walls)                                               */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!host) return;
    const channel = supabase
      .channel(`events-dashboard-${host.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `host_id=eq.${host.id}`,
        },
        (payload) => {
          const updated = payload.new;
          setEvents((prev) =>
            prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [host]);

  /* -------------------------------------------------------------------------- */
  /* ⚙️ OPTIONS HANDLERS                                                       */
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* -------------------------------------------------------------------------- */
  /* ⏳ LOADING STATE                                                           */
  /* -------------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 🧱 UI LAYOUT                                                               */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white flex flex-col items-center p-8">
      {/* HEADER */}
      <div className="w-full flex items-center justify-between mb-6">
        <HostProfilePanel host={host} setHost={setHost} onLogoUpload={handleLogoUpload} />
        <h1 className="text-2xl font-bold text-center flex-1">FanInteract Dashboard</h1>
        <div className="w-10" />
      </div>

      <DashboardHeader
        onCreateFanWall={() => setFanWallModalOpen(true)}
        onCreatePoll={() => setPollModalOpen(true)}
        onCreatePrizeWheel={() => setPrizeWheelModalOpen(true)}
      />

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
        refreshPrizeWheels={refreshWheels}
        onOpenOptions={setSelectedWheel}
      />

      {/* ---------- MODALS ---------- */}
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
          await refreshWheels();
          showToast('✅ Prize Wheel created!');
        }}
      />

      {/* Fan Wall Options */}
      {selectedWall && (
        <OptionsModalFanWall
          event={selectedWall}
          hostId={host.id}
          onClose={() => setSelectedWall(null)}
          onBackgroundChange={async (event, val) => {
            await handleBackgroundChange('events', event.id, val);
            await refreshEvents();
          }}
          refreshEvents={refreshEvents}
        />
      )}

      {/* Poll Options */}
      {selectedPoll && (
        <OptionsModalPoll
          event={selectedPoll}
          hostId={host.id}
          onClose={() => setSelectedPoll(null)}
          onBackgroundChange={async (event, val) => {
            await handleBackgroundChange('polls', event.id, val);
            await refreshPolls();
          }}
          refreshEvents={refreshPolls}
        />
      )}

      {/* ✅ Prize Wheel Options */}
      {selectedWheel && (
        <OptionsModalPrizeWheel
          event={selectedWheel}
          hostId={host.id}
          onClose={() => setSelectedWheel(null)}
          onBackgroundChange={async (wheel, val) => {
            await handleBackgroundChange('prizewheels', wheel.id, val);
            await refreshWheels();
            showToast('✅ Prize Wheel updated!');
          }}
          refreshPrizeWheels={refreshWheels}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn z-50">
          {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}