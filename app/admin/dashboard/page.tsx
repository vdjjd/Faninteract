'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getEventsByHost } from '@/lib/actions/events';
import { getPollsByHost } from '@/lib/actions/polls';
import { getPrizeWheelsByHost } from '@/lib/actions/prizewheels';

import DashboardHeader from './components/DashboardHeader';
import CreateFanWallModal from '@/components/CreateFanWallModal';
import CreatePollModal from '@/components/CreatePollModal';
import CreatePrizeWheelModal from '@/components/CreatePrizeWheelModal'; // ✅ NEW
import FanWallGrid from './components/FanWallGrid';
import PollGrid from './components/PollGrid';
import PrizeWheelGrid from './components/PrizeWheelGrid';
import OptionsModalFanWall from '@/components/OptionsModalFanWall';
import OptionsModalPoll from '@/components/OptionsModalPoll';
import HostProfilePanel from '@/components/HostProfilePanel';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [wheels, setWheels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // 🔸 Modal States
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPollModalOpen, setPollModalOpen] = useState(false);
  const [isPrizeWheelModalOpen, setPrizeWheelModalOpen] = useState(false); // ✅ NEW
  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<any | null>(null);

  /* -------------------------------------------------------------------------- */
  /* 🧠 LOAD HOST + INITIAL DATA                                                */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ Unable to get Supabase user:', authError?.message);
          setLoading(false);
          return;
        }

        const { data: hostRow } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        let activeHost = hostRow;

        if (!hostRow) {
          const { data: newHost, error: insertError } = await supabase
            .from('hosts')
            .insert([
              {
                auth_id: user.id,
                email: user.email,
                username:
                  user.user_metadata?.username ||
                  user.email?.split('@')[0] ||
                  null,
                first_name: user.user_metadata?.first_name || null,
                last_name: user.user_metadata?.last_name || null,
              },
            ])
            .select()
            .maybeSingle();

          if (insertError) {
            console.error('❌ Failed to auto-create host record:', insertError.message);
          } else {
            console.log('🆕 Auto-created host record for', user.email);
            activeHost = newHost;
          }
        }

        if (!activeHost) {
          console.error('⚠️ No valid host record found or created.');
          setLoading(false);
          return;
        }

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
      if (!logoUrl) throw new Error('❌ No public URL generated');

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
  async function refreshEvents() {
    if (!host) return;
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function refreshPolls() {
    if (!host) return;
    const updated = await getPollsByHost(host.id);
    setPolls(updated);
  }

  async function refreshWheels() {
    if (!host) return;
    const updated = await getPrizeWheelsByHost(host.id);
    setWheels(updated);
  }

  /* -------------------------------------------------------------------------- */
  /* 📡 REALTIME SYNC (Fan Walls only for now)                                  */
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
          const updatedEvent = payload.new;
          setEvents((prev) =>
            prev.map((ev) =>
              ev.id === updatedEvent.id ? { ...ev, ...updatedEvent } : ev
            )
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [host]);

  /* -------------------------------------------------------------------------- */
  /* ✳️ CREATE HANDLERS + TOASTS                                                */
  /* -------------------------------------------------------------------------- */
  function handleCreateFanWall() {
    setFanWallModalOpen(true);
  }

  function handleCreatePoll() {
    setPollModalOpen(true);
  }

  function handleCreatePrizeWheel() {
    setPrizeWheelModalOpen(true); // ✅ NEW
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

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
      {/* HEADER SECTION */}
      <div className="w-full flex items-center justify-between mb-6">
        <HostProfilePanel host={host} setHost={setHost} onLogoUpload={handleLogoUpload} />
        <h1 className="text-2xl font-bold text-center flex-1">FanInteract Dashboard</h1>
        <div className="w-10" />
      </div>

      {/* MAIN DASHBOARD */}
      <DashboardHeader
        onCreateFanWall={handleCreateFanWall}
        onCreatePoll={handleCreatePoll}
        onCreatePrizeWheel={handleCreatePrizeWheel} // ✅ NEW
      />

      <FanWallGrid
        events={events}
        host={host}
        refreshEvents={refreshEvents}
        onOpenOptions={(wall) => setSelectedWall(wall)}
      />

      <PollGrid
        polls={polls}
        host={host}
        refreshPolls={refreshPolls}
        onOpenOptions={(poll) => setSelectedPoll(poll)}
      />

      <PrizeWheelGrid
        wheels={wheels}
        host={host}
        refreshPrizeWheels={refreshWheels}
        onOpenOptions={(wheel) =>
          console.log('⚙️ Open options for Prize Wheel:', wheel)
        }
      />

      {/* MODALS */}
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
        isOpen={isPrizeWheelModalOpen} // ✅ NEW
        onClose={() => setPrizeWheelModalOpen(false)} // ✅ NEW
        hostId={host?.id} // ✅ NEW
        refreshPrizeWheels={async () => {
          await refreshWheels();
          showToast('✅ Prize Wheel created!');
        }}
      />

      {/* Options Modals */}
      {selectedWall && (
        <OptionsModalFanWall
          event={selectedWall}
          hostId={host.id}
          onClose={() => setSelectedWall(null)}
          onBackgroundChange={async (event, newValue) => {
            await supabase.from('events').update({
              background_value: newValue,
              updated_at: new Date().toISOString(),
            }).eq('id', event.id);
            await refreshEvents();
          }}
          refreshEvents={refreshEvents}
        />
      )}

      {selectedPoll && (
        <OptionsModalPoll
          event={selectedPoll}
          hostId={host.id}
          onClose={() => setSelectedPoll(null)}
          onBackgroundChange={async (event, newValue) => {
            await supabase.from('polls').update({
              background_value: newValue,
              updated_at: new Date().toISOString(),
            }).eq('id', event.id);
            await refreshPolls();
          }}
          refreshEvents={refreshPolls}
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