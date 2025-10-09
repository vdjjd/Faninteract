import { supabase } from '@/lib/supabaseClient';

// ✅ Create new event
export async function createEvent(host_id: string, { title }: { title: string }) {
  const { data, error } = await supabase
    .from('events')
    .insert([
      {
        host_id,
        title,
        status: 'inactive',
        type: 'fan_wall',
        team: null,
        theme_colors: null,
        background_url: null,
        countdown: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating event:', error.message);
    throw error;
  }

  console.log('✅ Event created:', data);
  return data;
}

// ✅ Get all events for a host
export async function getEventsByHost(host_id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('host_id', host_id)
    .eq('deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching events:', error.message);
    return [];
  }

  return data;
}

// ✅ Delete event (soft delete)
export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .update({
      deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('❌ Error deleting event:', error.message);
    throw error;
  }
}

// ✅ Clear all posts from a wall
export async function clearEventPosts(event_id: string) {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('event_id', event_id);

  if (error) {
    console.error('❌ Error clearing posts:', error.message);
    throw error;
  }
}

// ✅ Toggle live/inactive
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
}
