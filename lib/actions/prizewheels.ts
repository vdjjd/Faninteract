'use client'; // mark as frontend-safe

import { supabase } from '@/lib/supabaseClient'; // <-- public client

/* -------------------------------------------------------------------------- */
/* 🟢 GET PRIZE WHEELS BY HOST                                                 */
/* -------------------------------------------------------------------------- */
export async function getPrizeWheelsByHost(hostId: string) {
  try {
    const { data, error } = await supabase
      .from('prize_wheels')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching prize wheels:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ Exception in getPrizeWheelsByHost:', err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE PRIZE WHEEL                                                      */
export async function deletePrizeWheel(id: string) {
  try {
    const { error } = await supabase.from('prize_wheels').delete().eq('id', id);
    if (error) throw error;
    console.log('🗑️ Prize wheel deleted:', id);
  } catch (err) {
    console.error('❌ Error deleting prize wheel:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ TOGGLE PRIZE WHEEL STATUS                                                */
export async function togglePrizeWheelStatus(id: string, makeLive: boolean) {
  try {
    const { error } = await supabase
      .from('prize_wheels')
      .update({
        status: makeLive ? 'live' : 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    console.log(`🔄 Prize wheel ${id} → ${makeLive ? 'LIVE' : 'INACTIVE'}`);
  } catch (err) {
    console.error('❌ Error toggling prize wheel status:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧹 CLEAR PRIZE WHEEL (placeholder so import doesn't break)                 */
export async function clearPrizeWheel(id: string) {
  console.log(`⚠️ Placeholder: clearPrizeWheel called for ${id}`);
  // You can implement actual clearing later
}
