'use server';

import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE PRIZE WHEEL (server only)                                        */
/* -------------------------------------------------------------------------- */
export async function createPrizeWheel(hostId: string, data: any) {
  try {
    const { title } = data;

    // ✅ NO PRIZES — matches your actual table schema
    const newWheel = {
      host_id: hostId,
      title: title || 'Untitled Prize Wheel',
      host_title: title || 'Untitled Prize Wheel',
      status: 'inactive',
      background_type: 'gradient',
      background_value: 'linear-gradient(135deg,#1a237e,#3949ab)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase
      .from('prize_wheels')
      .insert([newWheel])
      .select()
      .maybeSingle();

    if (error || !created) {
      console.error('❌ Error creating prize wheel:', error?.message || error);
      return null;
    }

    const qrUrl = `https://faninteract.vercel.app/prizewheel/${created.id}`;

    const { data: updated, error: updateError } = await supabase
      .from('prize_wheels')
      .update({
        qr_url: qrUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', created.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.warn(
        '⚠️ Wheel created but failed to save QR URL:',
        updateError.message
      );
      return created;
    }

    console.log('✅ Prize wheel created successfully:', updated?.id);
    return updated;
  } catch (err) {
    console.error('❌ Error creating prize wheel:', err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔍 GET PRIZE WHEELS BY HOST                                                */
/* -------------------------------------------------------------------------- */
export async function getPrizeWheelsByHost(hostId: string) {
  try {
    const { data, error } = await supabase
      .from('prize_wheels')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching prize wheels by host:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ Unexpected error fetching prize wheels by host:', err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* 🟠 TOGGLE PRIZE WHEEL STATUS                                               */
/* -------------------------------------------------------------------------- */
export async function togglePrizeWheelStatus(
  wheelId: string,
  newStatus: 'live' | 'inactive'
) {
  try {
    const { data, error } = await supabase
      .from('prize_wheels')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wheelId)
      .select()
      .maybeSingle();

    if (error) {
      console.error(`❌ Error toggling wheel ${wheelId} status:`, error.message);
      return null;
    }

    console.log(`✅ Prize wheel ${wheelId} set to ${newStatus}`);
    return data;
  } catch (err) {
    console.error('❌ Unexpected error toggling wheel status:', err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE PRIZE WHEEL                                                      */
/* -------------------------------------------------------------------------- */
export async function deletePrizeWheel(wheelId: string) {
  try {
    const { error } = await supabase
      .from('prize_wheels')
      .delete()
      .eq('id', wheelId);

    if (error) throw error;

    console.log(`🗑️ Prize wheel ${wheelId} deleted`);
  } catch (err) {
    console.error('❌ Error deleting prize wheel:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧹 CLEAR PRIZE WHEEL ENTRIES                                               */
/* -------------------------------------------------------------------------- */
export async function clearPrizeWheel(wheelId: string) {
  try {
    const { error } = await supabase
      .from('prize_entries')
      .delete()
      .eq('wheel_id', wheelId);

    if (error) throw error;

    console.log(`🧹 Cleared prize entries for wheel ${wheelId}`);
  } catch (err) {
    console.error('❌ Error clearing prize wheel:', err);
  }
}
