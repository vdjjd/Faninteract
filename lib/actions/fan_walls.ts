'use client';

import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE FAN WALL                                                         */
/* -------------------------------------------------------------------------- */
export async function createFanWall(host_id: string, { title }: { title: string }) {
  try {
    const newWall = {
      host_id,
      title: title || 'Untitled Fan Zone Wall',
      status: 'inactive',
      layout_type: 'Grid4x2',
      transition_speed: 'Medium',
      post_transition: 'Fade In / Fade Out',
      countdown: null,
      countdown_active: false,
      background_type: 'gradient',
      background_value: 'linear-gradient(135deg,#0d47a1,#1976d2)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('fan_walls')
      .insert([newWall])
      .select()
      .maybeSingle();

    if (error || !data) throw error;

    console.log('✅ Fan wall created:', data.id);
    return data;
  } catch (err) {
    console.error('❌ Error creating fan wall:', err);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* 🟢 FETCH ALL FAN WALLS FOR A HOST                                          */
/* -------------------------------------------------------------------------- */
export async function getFanWallsByHost(host_id: string) {
  try {
    const { data, error } = await supabase
      .from('fan_walls')
      .select('*')
      .eq('host_id', host_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching fan walls:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ Exception in getFanWallsByHost:', err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPDATE FAN WALL SETTINGS                                                 */
/* -------------------------------------------------------------------------- */
export async function updateFanWallSettings(
  id: string,
  fields: Partial<{
    title: string;
    background_type: string;
    background_value: string;
    countdown: string | null;
    countdown_active: boolean;
    layout_type: string;
    transition_speed: string;
    post_transition: string;
  }>
) {
  const { data, error } = await supabase
    .from('fan_walls')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;

  console.log('✅ Fan wall updated:', id);
  return data;
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE FAN WALL                                                         */
/* -------------------------------------------------------------------------- */
export async function deleteFanWall(id: string) {
  const { error } = await supabase.from('fan_walls').delete().eq('id', id);
  if (error) throw error;
  console.log('🗑️ Fan wall deleted:', id);
}

/* -------------------------------------------------------------------------- */
/* 🧹 CLEAR POSTS FOR A WALL                                                   */
/* -------------------------------------------------------------------------- */
export async function clearFanWallPosts(fan_wall_id: string) {
  try {
    const { error } = await supabase
      .from('guest_posts')
      .delete()
      .eq('fan_wall_id', fan_wall_id);

    if (error) throw error;
    console.log('🧹 Posts cleared for fan wall:', fan_wall_id);
  } catch (err) {
    console.error('❌ Error clearing posts:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔁 TOGGLE LIVE / INACTIVE                                                   */
/* -------------------------------------------------------------------------- */
export async function toggleFanWallStatus(id: string, makeLive: boolean) {
  const { error } = await supabase
    .from('fan_walls')
    .update({ status: makeLive ? 'live' : 'inactive', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  console.log(`🔄 Fan wall ${id} → ${makeLive ? 'LIVE' : 'INACTIVE'}`);
}
