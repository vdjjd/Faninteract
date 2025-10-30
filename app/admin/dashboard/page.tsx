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
import HostProfilePanel from '@/components/HostProfilePanel';
import { cn } from '../../../lib/utils';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [wheels, setWheels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  /* ------------------ LOAD HOST + INITIAL DATA ------------------ */
  useEffect(() => {
    async function load() {
      try {
        // 1️⃣ Get the authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) throw new Error(authError?.message || 'No user found');

        // 2️⃣ Try to fetch existing host
        const { data: hostRow, error: hostError } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .single();

        let activeHost = hostRow;

        // 3️⃣ If no host record exists, create one
        if (!activeHost) {
          console.warn('⚠️ No host record found — creating new one for:', user.id);

          const newHostData = {
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
          };

          const { data: newHost, error: insertError } = await supabase
            .from('hosts')
            .insert(newHostData)
            .select('*')
            .single();

          if (insertError) throw insertError;

          activeHost = newHost;
        }

        if (!activeHost?.id) throw new Error('Host record missing ID');

        setHost(activeHost);
        console.log('✅ Active host loaded:', activeHost);

        // 4️⃣ Fetch associated data
        const [fetchedEvents, fetchedPolls, fetchedWheels] = await Promise.all([
          getEventsByHost(activeHost.id),
          getPollsByHost(activeHost.id),
          getPrizeWheelsByHost(activeHost.id),
        ]);

        setEvents(fetchedEvents || []);
        setPolls(fetchedPolls || []);
        setWheels(fetchedWheels || []);
      } catch (err: any) {
        console.error('❌ Error loading dashboard data:', err.message || err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ------------------ REFRESH HELPERS ------------------ */
  const refreshEvents = async () => host?.id && setEvents(await getEventsByHost(host.id));
  const refreshPolls = async () => host?.id && setPolls(await getPollsByHost(host.id));
  const refreshPrizeWheels = async () => host?.id && setWheels(await getPrizeWheelsByHost(host.id));

  /* ------------------ TOAST ------------------ */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* ------------------ LOADING ------------------ */
  if (loading) {
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
        <p>Loading...</p>
      </div>
    );
  }

  /* ------------------ MAIN UI ------------------ */
  return (
    <div
      className={cn(
        'min-h-screen',
        'bg-gradient-to-br',
        'from-[#0a2540]',
        'via-[#1b2b44]',
        'to-black',
        'text-white',
        'flex',
        'flex-col',
        'items-center',
        'p-8'
      )}
    >
      <div className={cn('w-full', 'flex', 'items-center', 'justify-between', 'mb-6')}>
        <HostProfilePanel host={host} setHost={setHost} onLogoUpload={() => {}} />
        <h1 className={cn('text-2xl', 'font-bold', 'text-center', 'flex-1')}>
          FanInteract Dashboard
        </h1>
        <div className="w-10" />
      </div>

      <DashboardHeader
        onCreateFanWall={() => showToast('Fan Wall modal coming soon')}
        onCreatePoll={() => showToast('Poll modal coming soon')}
        onCreatePrizeWheel={() => showToast('Prize Wheel modal coming soon')}
      />

      <FanWallGrid
        events={events}
        host={host}
        refreshEvents={refreshEvents}
        onOpenOptions={() => {}}
      />
      <PollGrid
        polls={polls}
        host={host}
        refreshPolls={refreshPolls}
        onOpenOptions={() => {}}
      />
      <PrizeWheelGrid
        wheels={wheels}
        host={host}
        refreshPrizeWheels={refreshPrizeWheels}
        onOpenOptions={() => {}}
      />

      {toast && (
        <div
          className={cn(
            'fixed',
            'bottom-6',
            'right-6',
            'bg-green-600/90',
            'text-white',
            'px-4',
            'py-2',
            'rounded-lg',
            'shadow-lg',
            'animate-fadeIn',
            'z-50'
          )}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
