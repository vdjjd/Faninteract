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
import { cn } from "../../../lib/utils";

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [wheels, setWheels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [isFanWallModalOpen, setFanWallModalOpen] = useState(false);
  const [isPollModalOpen, setPollModalOpen] = useState(false);
  const [isPrizeWheelModalOpen, setPrizeWheelModalOpen] = useState(false);

  const [selectedWall, setSelectedWall] = useState<any | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<any | null>(null);
  const [selectedWheel, setSelectedWheel] = useState<any | null>(null);

  /* ------------------ LOAD HOST + INITIAL DATA ------------------ */
  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) throw new Error(authError?.message || 'No user found');

        // ✅ 1️⃣ Fetch host using new schema (auth_id)
        const { data: hostRow, error: fetchError } = await supabase
          .from('hosts')
          .select('id, auth_id, username, venue_name, email, first_name, last_name, role, created_at, master_id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Error fetching host row:', fetchError.message);
        }

        let activeHost = hostRow;

        // ✅ 2️⃣ If no host exists, create one using only valid columns
        if (!activeHost) {
          console.warn('⚠️ No host record found — creating new one for:', user.id);

          const { data: newHost, error: insertError } = await supabase
            .from('hosts')
            .insert([
              {
                id: crypto.randomUUID(), // required since id is NOT defaulted
                auth_id: user.id,
                email: user.email,
                username:
                  user.user_metadata?.username ||
                  user.email?.split('@')[0] ||
                  'new_user',
                first_name: user.user_metadata?.first_name || null,
                last_name: user.user_metadata?.last_name || null,
                venue_name: 'My Venue',
                role: 'host',
              },
            ])
            .select()
            .maybeSingle();

          if (insertError) {
            console.error('❌ Error creating new host:', insertError.message);
          }

          activeHost = newHost || null;
        }

        // ✅ 3️⃣ If still no host, stop gracefully
        if (!activeHost || !activeHost.id) {
          console.warn('⚠️ No activeHost.id — skipping event/poll/wheel fetch');
          setHost(null);
          setEvents([]);
          setPolls([]);
          setWheels([]);
          return;
        }

        // ✅ 4️⃣ Set host and load data
        setHost(activeHost);
        console.log('✅ Active host loaded:', activeHost);

        const [fetchedEvents, fetchedPolls, fetchedWheels] = await Promise.all([
          getEventsByHost(activeHost.id),
          getPollsByHost(activeHost.id),
          getPrizeWheelsByHost(activeHost.id),
        ]);

        setEvents(fetchedEvents || []);
        setPolls(fetchedPolls || []);
        setWheels(fetchedWheels || []);
      } catch (err) {
        console.error('❌ Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ------------------ REFRESH HELPERS ------------------ */
  const refreshEvents = async () => host?.id && setEvents(await getEventsByHost(host.id));
  const refreshPolls = async () => host?.id && setPolls(await getPollsByHost(host.id));
  const refreshPrizeWheels = async () =>
    host?.id && setWheels(await getPrizeWheelsByHost(host.id));

  /* ------------------ HANDLERS ------------------ */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* ------------------ LOADING ------------------ */
  if (loading)
    return (
      <div className={cn('flex', 'items-center', 'justify-center', 'h-screen', 'bg-black', 'text-white')}>
        <p>Loading...</p>
      </div>
    );

  /* ------------------ UI ------------------ */
  return (
    <div className={cn('min-h-screen', 'bg-gradient-to-br', 'from-[#0a2540]', 'via-[#1b2b44]', 'to-black', 'text-white', 'flex', 'flex-col', 'items-center', 'p-8')}>
      <div className={cn('w-full', 'flex', 'items-center', 'justify-between', 'mb-6')}>
        <HostProfilePanel host={host} setHost={setHost} onLogoUpload={() => {}} />
        <h1 className={cn('text-2xl', 'font-bold', 'text-center', 'flex-1')}>FanInteract Dashboard</h1>
        <div className="w-10" />
      </div>

      <DashboardHeader
        onCreateFanWall={() => setFanWallModalOpen(true)}
        onCreatePoll={() => setPollModalOpen(true)}
        onCreatePrizeWheel={() => setPrizeWheelModalOpen(true)}
      />

      <FanWallGrid events={events} host={host} refreshEvents={refreshEvents} onOpenOptions={setSelectedWall} />
      <PollGrid polls={polls} host={host} refreshPolls={refreshPolls} onOpenOptions={setSelectedPoll} />
      <PrizeWheelGrid wheels={wheels} host={host} refreshPrizeWheels={refreshPrizeWheels} onOpenOptions={setSelectedWheel} />

      {toast && (
        <div className={cn('fixed', 'bottom-6', 'right-6', 'bg-green-600/90', 'text-white', 'px-4', 'py-2', 'rounded-lg', 'shadow-lg', 'animate-fadeIn', 'z-50')}>
          {toast}
        </div>
      )}
    </div>
  );
}
