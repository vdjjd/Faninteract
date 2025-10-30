import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧱 FAN WALL ACTIONS - Clean version for new schema                         */
/* -------------------------------------------------------------------------- */

/* ✅ CREATE FAN WALL */
export async function createFanWall(host_id: string, { title }: { title: string }) {
  try {
    // 1️⃣ Insert new fan wall
    const { data, error } = await supabase
      .from('fan_walls')
      .insert([
        {
          host_id,
          host_title: `${title} Fan Zone Wall`,
          title,
          status: 'inactive',
          background_type: 'gradient',
          background_value: 'linear-gradient(to bottom right, #4dc6ff, #001f4d)',
          countdown: null,
          pending_posts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();

    if (error || !data) throw error;

    console.log('✅ Fan wall created successfully:', data.id);
    return data;
  } catch (err) {
    console.error('❌ Error in createFanWall:', err);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ FETCH ALL FAN WALLS FOR A HOST */
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
/* ✅ UPDATE FAN WALL SETTINGS */
export async function updateFanWallSettings(
  id: string,
  fields: Partial<{
    host_title: string;
    title: string;
    background_type: string;
    background_value: string;
    countdown: string | null;
  }>
) {
  const { data, error } = await supabase
    .from('fan_walls')
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;

  console.log('✅ Fan wall updated:', id);
  return data;
}

/* -------------------------------------------------------------------------- */
/* ✅ DELETE FAN WALL */
export async function deleteFanWall(id: string) {
  const { error } = await supabase.from('fan_walls').delete().eq('id', id);
  if (error) throw error;
  console.log('🗑️ Fan wall deleted:', id);
}

/* -------------------------------------------------------------------------- */
/* ✅ CLEAR POSTS FOR A WALL */
export async function clearFanWallPosts(fan_wall_id: string) {
  try {
    const { error } = await supabase
      .from('guest_posts')
      .delete()
      .eq('fan_wall_id', fan_wall_id);

    if (error) throw error;

    console.log('🧹 Posts cleared for fan wall:', fan_wall_id);

    await supabase
      .from('fan_walls')
      .update({ pending_posts: 0, updated_at: new Date().toISOString() })
      .eq('id', fan_wall_id);
  } catch (err) {
    console.error('❌ Error clearing posts:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ TOGGLE LIVE / INACTIVE */
export async function toggleFanWallStatus(id: string, makeLive: boolean) {
  const { error } = await supabase
    .from('fan_walls')
    .update({
      status: makeLive ? 'live' : 'inactive',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
  console.log(`🔄 Fan wall ${id} → ${makeLive ? 'LIVE' : 'INACTIVE'}`);
}

/* -------------------------------------------------------------------------- */
/* ✅ UPDATE PENDING POST COUNT */
export async function updatePendingPosts(fan_wall_id: string, delta: number) {
  const { error } = await supabase.rpc('increment_pending_posts', {
    fan_wall_id,
    delta,
  });

  if (error) throw error;
  console.log('🔔 Pending posts updated:', { fan_wall_id, delta });
}
