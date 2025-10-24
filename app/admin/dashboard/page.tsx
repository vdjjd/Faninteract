'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getEventsByHost } from '@/lib/actions/events';
import { getPollsByHost } from '@/lib/actions/polls';
import DashboardHeader from './components/DashboardHeader';
import CreateFanWallModal from '@/components/CreateFanWallModal';
import CreatePollModal from '@/components/CreatePollModal';
import FanWallGrid from './components/FanWallGrid';
import PollGrid from './components/PollGrid';
import OptionsModalFanWall from '@/components/OptionsModalFanWall';
import OptionsModalPoll from '@/components/OptionsModalPoll';
import HostProfilePanel from '@/components/HostProfilePanel';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // 🔸 Modal States
  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPollModalOpen, setPollModalOpen] = useState(false);
  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<any | null>(null);

  /* -------------------------------------------------------------------------- */
  /* 🧠 LOAD HOST + INITIAL DATA                                                */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error('❌ Unable to get Supabase user:', authError?.message);
          setLoading(false);
          return;
        }

        const { data: hostRow, error: hostError } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        let activeHost = hostRow;

        // 🆕 Auto-create host record if none exists
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

        const [fetchedEvents, fetchedPolls] = await Promise.all([
          getEventsByHost(activeHost.id),
          getPollsByHost(activeHost.id),
        ]);

        setEvents(fetchedEvents);
        setPolls(fetchedPolls);
      } catch (err) {
        console.error('❌ Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* -------------------------------------------------------------------------- */
  /* 🖼️ LOGO UPLOAD                                                            */
  /* -------------------------------------------------------------------------- */
  async function handleLogoUpload(file: File) {
    if (!host) return;

    const { data, error } = await supabase.storage
      .from('host-logos')
      .upload(`${host.id}/${file.name}`, file, { upsert: true });

    if (error) {
      console.error('❌ Logo upload failed:', error.message);
      return;
    }

    const url = supabase.storage
      .from('host-logos')
      .getPublicUrl(data.path).data.publicUrl;

    await supabase.from('hosts').update({ logo_url: url }).eq('id', host.id);

    // ✅ Instantly update without reload
    setHost({ ...host, logo_url: url });
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

  /* -------------------------------------------------------------------------- */
  /* 📡 REALTIME SYNC (Events)                                                  */
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

    return () => {
      supabase.removeChannel(channel);
    };
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
        {/* 🟢 Host Profile */}
        <HostProfilePanel
          host={host}
          setHost={setHost}  // ✅ Added to allow instant state updates
          onLogoUpload={handleLogoUpload}
        />

        <h1 className="text-2xl font-bold text-center flex-1">
          FanInteract Dashboard
        </h1>

        <div className="w-10" /> {/* alignment spacer */}
      </div>

      {/* MAIN DASHBOARD */}
      <DashboardHeader
        onCreateFanWall={handleCreateFanWall}
        onCreatePoll={handleCreatePoll}
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

      {selectedWall && (
        <OptionsModalFanWall
          event={selectedWall}
          hostId={host.id}
          onClose={() => setSelectedWall(null)}
          onBackgroundChange={async (event, newValue) => {
            await supabase
              .from('events')
              .update({
                background_value: newValue,
                updated_at: new Date().toISOString(),
              })
              .eq('id', event.id);
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
            await supabase
              .from('polls')
              .update({
                background_value: newValue,
                updated_at: new Date().toISOString(),
              })
              .eq('id', event.id);
            await refreshPolls();
          }}
          refreshEvents={refreshPolls}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn z-50">
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