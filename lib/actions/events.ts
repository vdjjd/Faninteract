'use server';

import { supabase } from '@/lib/supabaseClient';

// ✅ Create a new Fan Zone Wall (event)
export async function createEvent(hostId: string, data: {
  title: string;
  team?: string;
  theme_colors?: string;
  background_url?: string;
  countdown?: string | null;
  transition?: string;
  auto_delete_minutes?: number;
}) {
  const { error } = await supabase
    .from('events')
    .insert([{
      host_id: hostId,
      title: data.title,
      type: 'fan_wall',
      team: data.team || null,
      status: 'inactive',
      theme_colors: data.theme_colors || '#1e90ff,#111',
      background_url: data.background_url || null,
      countdown: data.countdown || null,
      transition: data.transition || 'fade',
      auto_delete_minutes: data.auto_delete_minutes || 0,
      deleted: false,
    }]);

  if (error) throw new Error(`Error creating event: ${error.message}`);
  return true;
}

// ✅ Get all events for a specific host
export async function getEventsByHost(hostId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('host_id', hostId)
    .eq('deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error fetching events: ${error.message}`);
  return data || [];
}

// ✅ Update an existing event (title, theme, etc.)
export async function updateEvent(eventId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId);

  if (error) throw new Error(`Error updating event: ${error.message}`);
  return true;
}

// ✅ Delete event permanently (hard delete, after confirmation)
export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw new Error(`Error deleting event: ${error.message}`);
  return true;
}

// ✅ Clear all posts (submissions) for a specific event — keeps event
export async function clearEventPosts(eventId: string) {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('event_id', eventId);

  if (error) throw new Error(`Error clearing posts: ${error.message}`);
  return true;
}

// ✅ Toggle event status between 'live' and 'inactive'
export async function toggleEventStatus(eventId: string, isLive: boolean) {
  const { error } = await supabase
    .from('events')
    .update({ status: isLive ? 'live' : 'inactive' })
    .eq('id', eventId);

  if (error) throw new Error(`Error updating status: ${error.message}`);
  return true;
}
