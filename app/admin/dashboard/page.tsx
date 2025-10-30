'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getFanWallsByHost } from '@/lib/actions/fan_walls';
import { getPollsByHost } from '@/lib/actions/polls';
import { getPrizeWheelsByHost } from '@/lib/actions/prizewheels';

import DashboardHeader from './components/DashboardHeader';
import FanWallGrid from './components/FanWallGrid';
import PollGrid from './components/PollGrid';
import PrizeWheelGrid from './components/PrizeWheelGrid';
import HostProfilePanel from '@/components/HostProfilePanel';
import { cn } from '../../../lib/utils';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [walls, setWalls] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [wheels, setWheels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // 1️⃣ Get authenticated user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) throw new Error(authError?.message || 'No authenticated user found');

        // 2️⃣ Fetch existing host
        const { data: hostRow, error: hostError } = await supabase
          .from('hosts')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (hostError) throw hostError;

        let activeHost = hostRow;

        // 3️⃣ If no host exists, create one
        if (!activeHost) {
          console.warn('⚠️ No host record found — creating new one for:', user.id);

          const newHostData = {
            auth_id: user.id,
            email: user.email,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'new_user',
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null,
            venue_name: 'My Venue',
            role: 'host',
          };

          const { data: newHost, error: insertError } = await supabase
            .from('hosts')
            .insert([newHostData])
            .select('*')
            .maybeSingle();

          if (insertError) throw insertError;
          activeHost = newHost;
        }

        if (!activeHost?.id) throw new Error('Host record missing ID');

        setHost(activeHost);
        console.log('✅ Active host loaded:', activeHost);

        // 4️⃣ Fetch all related data
        const [fetchedWalls, fetchedPolls, fetchedWheels] = await Promise.all([
          getFanWallsByHost(activeHost.id),
          getPollsByHost(activeHost.id),
          getPrizeWheelsByHost(activeHost.id),
        ]);

        setWalls(fetchedWalls || []);
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

  const refreshFanWalls = async () => host?.id && setWalls(await getFanWallsByHost(host.id));
  const refreshPolls = async () => host?.id && setPolls(await getPollsByHost(host.id));
  const refreshPrizeWheels = async () => host?.id && setWheels(await getPrizeWheelsByHost(host.id));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className={cn('flex', 'items-center', 'justify-center', 'h-screen', 'bg-black', 'text-white')}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-black text-white flex flex-col items-center p-8'
    )}>
      <div className={cn('w-full flex items-center justify-between mb-6')}>
        <HostProfilePanel host={host} setHost={setHost} onLogoUpload={() => {}} />
        <h1 className={cn('text-2xl font-bold text-center flex-1')}>FanInteract Dashboard</h1>
        <div className="w-10" />
      </div>

      <DashboardHeader
        onCreateFanWall={() => showToast('Fan Wall modal coming soon')}
        onCreatePoll={() => showToast('Poll modal coming soon')}
        onCreatePrizeWheel={() => showToast('Prize Wheel modal coming soon')}
      />

      <FanWallGrid walls={walls} host={host} refreshFanWalls={refreshFanWalls} onOpenOptions={() => {}} />
      <PollGrid polls={polls} host={host} refreshPolls={refreshPolls} onOpenOptions={() => {}} />
      <PrizeWheelGrid wheels={wheels} host={host} refreshPrizeWheels={refreshPrizeWheels} onOpenOptions={() => {}} />

      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn z-50'
        )}>
          {toast}
        </div>
      )}
    </div>
  );
}
