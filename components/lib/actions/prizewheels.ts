'use server';

import { supabase } from '@/lib/supabaseClient';

/* ---------- CREATE PRIZE WHEEL ---------- */
export async function createPrizeWheel(hostId: string, data: any) {
  const { title } = data;

  const { data: newWheel, error } = await supabase
    .from('prize_wheels')
    .insert([
      {
        host_id: hostId,
        title,
        host_title: title,
        status: 'inactive',
        visibility: 'public', // can be 'private' later with passphrase
        background_type: 'gradient',
        background_value: 'linear-gradient(135deg,#0d47a1,#1976d2)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating prize wheel:', error);
    return null;
  }

  // ✅ Broadcast creation event (for real-time dashboard refresh)
  try {
    supabase.channel('prizewheels-realtime').send({
      type: 'broadcast',
      event: 'prizewheel_created',
      payload: { id: newWheel.id, host_id: hostId },
    });
  } catch (err) {
    console.warn('⚠️ Broadcast failed (safe to ignore on localhost):', err);
  }

  return newWheel;
}

/* ---------- GET ALL PRIZE WHEELS FOR A HOST ---------- */
export async function getPrizeWheelsByHost(hostId: string) {
  const { data, error } = await supabase
    .from('prize_wheels')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching prize wheels:', error);
    return [];
  }
  return data || [];
}

/* ---------- UPDATE STATUS (Play / Stop) ---------- */
export async function updatePrizeWheelStatus(id: string, status: 'live' | 'inactive') {
  const { error } = await supabase
    .from('prize_wheels')
    .update({
      status,
      countdown_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('❌ Error updating prize wheel status:', error);
    return false;
  }

  supabase.channel(`prizewheel-${id}`).send({
    type: 'broadcast',
    event: 'UPDATE',
    payload: { id, status },
  });

  return true;
}

/* ---------- SPIN TRIGGER (Host presses Spin) ---------- */
export async function triggerSpin(id: string) {
  console.log(`🎡 Triggering spin for wheel ${id}`);
  try {
    supabase.channel(`prizewheel-${id}`).send({
      type: 'broadcast',
      event: 'spin_trigger',
      payload: { id, timestamp: Date.now() },
    });
  } catch (err) {
    console.error('❌ Spin trigger failed:', err);
  }
}

/* ---------- CLEAR (future use) ---------- */
export async function clearPrizeWheel(id: string) {
  // Placeholder for clearing participants once added
  console.log(`🧹 Clear entries for prize wheel ${id}`);
}

/* ---------- DELETE ---------- */
export async function deletePrizeWheel(id: string) {
  const { error } = await supabase.from('prize_wheels').delete().eq('id', id);
  if (error) {
    console.error('❌ Error deleting prize wheel:', error);
    return false;
  }
  return true;
}