import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧱 EVENT ACTIONS - For Host Dashboard + Fan Walls                          */
/* -------------------------------------------------------------------------- */

/* ✅ CREATE EVENT */
export async function createEvent(host_id: string, { title }: { title: string }) {
  try {
    // 1️⃣ Create the base event
    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          host_id,
          host_title: `${title} Fan Zone Wall`,
          title,
          status: 'inactive',
          type: 'fan_wall',
          background_type: 'gradient',
          background_value: 'linear-gradient(to bottom right, #4dc6ff, #001f4d)',
          theme_colors: null,
          team: null,
          countdown: null,
          pending_posts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted: false,
        },
      ])
      .select()
      .maybeSingle(); // ✅ safe: returns null instead of 406 if missing

    if (error || !data) {
      console.error('❌ Error creating event:', error?.message || 'Unknown error');
      throw error;
    }

    // 2️⃣ Generate QR URL
    const qrUrl = `https://faninteract.vercel.app/wall/${data.id}`;

    // 3️⃣ Update with QR URL
    const { data: updated, error: updateError } = await supabase
      .from('events')
      .update({ qr_url: qrUrl, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .select()
      .maybeSingle(); // ✅ same protection here

    if (updateError) {
      console.warn('⚠️ Event created but failed to update QR URL:', updateError.message);
      return data;
    }

    console.log('✅ Event created successfully:', updated?.id);
    return updated;
  } catch (err) {
    console.error('❌ Error in createEvent:', err);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ FETCH ALL EVENTS FOR A HOST (no .single() = no 406s) */
export async function getEventsByHost(host_id: string) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', host_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching events:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ Exception in getEventsByHost:', err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ UPDATE EVENT SETTINGS */
export async function updateEventSettings(
  id: string,
  fields: Partial<{
    host_title: string;
    title: string;
    background_type: string;
    background_value: string;
    theme_colors: string;
    countdown: string | null;
  }>
) {
  const { data, error } = await supabase
    .from('events')
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle(); // ✅ switched from .single()

  if (error) {
    console.error('❌ Error updating event settings:', error.message);
    throw error;
  }

  console.log('✅ Event updated:', id);
  return data;
}

/* -------------------------------------------------------------------------- */
/* ✅ DELETE EVENT */
export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) {
    console.error('❌ Error deleting event:', error.message);
    throw error;
  }

  console.log('🗑️ Event deleted:', id);
}

/* -------------------------------------------------------------------------- */
/* ✅ CLEAR POSTS FOR A WALL */
export async function clearEventPosts(event_id: string) {
  try {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('event_id', event_id);

    if (error) throw error;

    console.log('🧹 Posts cleared for event:', event_id);

    // Reset pending count
    await supabase
      .from('events')
      .update({ pending_posts: 0, updated_at: new Date().toISOString() })
      .eq('id', event_id);
  } catch (err) {
    console.error('❌ Error clearing posts:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ TOGGLE LIVE / INACTIVE */
export async function toggleEventStatus(id: string, makeLive: boolean) {
  const { error } = await supabase
    .from('events')
    .update({
      status: makeLive ? 'live' : 'inactive',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('❌ Error toggling event status:', error.message);
    throw error;
  }

  console.log(`🔄 Event ${id} → ${makeLive ? 'LIVE' : 'INACTIVE'}`);
}

/* -------------------------------------------------------------------------- */
/* ✅ UPDATE PENDING POST COUNT */
export async function updatePendingPosts(event_id: string, delta: number) {
  const { error } = await supabase.rpc('increment_pending_posts', { event_id, delta });

  if (error) {
    console.error('❌ Error updating pending posts:', error.message);
    throw error;
  }

  console.log('🔔 Pending posts updated:', { event_id, delta });
}