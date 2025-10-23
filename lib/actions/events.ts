import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧱 EVENT ACTIONS - For Host Dashboard + Fan Walls                          */
/* -------------------------------------------------------------------------- */

// ✅ Create new event (auto QR code)
export async function createEvent(host_id: string, { title }: { title: string }) {
  try {
    // 1️⃣ Create the event
    const { data: event, error } = await supabase
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
      .single();

    if (error || !event) {
      console.error('❌ Error creating event:', error?.message || error);
      throw error;
    }

    // 2️⃣ Generate its QR URL
    const qrUrl = `https://faninteract.vercel.app/wall/${event.id}`;

    // 3️⃣ Update the record with the new QR URL
    const { data: updated, error: updateError } = await supabase
      .from('events')
      .update({ qr_url: qrUrl, updated_at: new Date().toISOString() })
      .eq('id', event.id)
      .select()
      .single();

    if (updateError) {
      console.error('⚠️ Event created but failed to save QR URL:', updateError.message);
      return event;
    }

    console.log('✅ Event created with QR URL:', updated.qr_url);
    return updated;
  } catch (err) {
    console.error('❌ Error in createEvent:', err);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
// ✅ Fetch all events for a given host
export async function getEventsByHost(host_id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('host_id', host_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching events:', error.message);
    return [];
  }

  return data;
}

/* -------------------------------------------------------------------------- */
// ✅ Update event appearance, titles, or countdown
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
    .single();

  if (error) {
    console.error('❌ Error updating event settings:', error.message);
    throw error;
  }

  console.log('✅ Event updated:', data);
  return data;
}

/* -------------------------------------------------------------------------- */
// ✅ Permanently delete an event from DB
export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) {
    console.error('❌ Error deleting event:', error.message);
    throw error;
  }

  console.log('🗑️ Event permanently deleted:', id);
}

/* -------------------------------------------------------------------------- */
// ✅ Clear posts for a specific wall
export async function clearEventPosts(event_id: string) {
  const { error } = await supabase.from('submissions').delete().eq('event_id', event_id);

  if (error) {
    console.error('❌ Error clearing posts:', error.message);
    throw error;
  }

  console.log('🧹 All posts cleared for event:', event_id);

  // Reset pending count
  await supabase
    .from('events')
    .update({ pending_posts: 0, updated_at: new Date().toISOString() })
    .eq('id', event_id);
}

/* -------------------------------------------------------------------------- */
// ✅ Toggle live/inactive state
export async function toggleEventStatus(id: string, makeLive: boolean) {
  const { error } = await supabase
    .from('events')
    .update({
      status: makeLive ? 'live' : 'inactive',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('❌ Error updating status:', error.message);
    throw error;
  }

  console.log(`🔄 Event ${id} set to ${makeLive ? 'live' : 'inactive'}`);
}

/* -------------------------------------------------------------------------- */
// ✅ Increment or reset pending post count
export async function updatePendingPosts(event_id: string, delta: number) {
  const { error } = await supabase.rpc('increment_pending_posts', { event_id, delta });

  if (error) {
    console.error('❌ Error updating pending posts:', error.message);
    throw error;
  }

  console.log('🔔 Pending posts updated:', { event_id, delta });
}