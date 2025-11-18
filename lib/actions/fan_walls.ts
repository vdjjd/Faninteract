'use client';

import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🟢 SINGLE SOURCE OF TRUTH: UNIFIED CHANNEL                                  */
/* -------------------------------------------------------------------------- */
function getUnifiedChannel() {
  return supabase.channel("faninteract_unified_shared", {
    config: {
      broadcast: { self: true }
    }
  });
}

async function broadcast(event: string, payload: any) {
  try {
    const safePayload = {
      ...payload,
      id: String(payload.id).trim(),
    };

    const unified = getUnifiedChannel();

    await unified.send({
      type: "broadcast",
      event,
      payload: safePayload,
    });
  } catch (err) {
    console.error("❌ Broadcast error:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE FAN WALL                                                         */
/* -------------------------------------------------------------------------- */
export async function createFanWall(host_id: string, { title }: { title: string }) {
  try {
    const newWall = {
      host_id,
      title: title || 'Untitled Fan Zone Wall',
      status: 'inactive',
      layout_type: 'singleHighlight',
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

    await broadcast("wall_created", { id: data.id, ...newWall });

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
/* 🟡 UPDATE FAN WALL SETTINGS                                                */
/* -------------------------------------------------------------------------- */
export async function updateFanWallSettings(
  id: string,
  fields: Partial<{
    title: string;
    host_title: string;
    background_type: string;
    background_value: string;
    countdown: string | null;
    countdown_active: boolean | null;
    layout_type: string;
    transition_speed: string;
    post_transition: string;
  }>
) {
  try {
    const cleanFields = Object.fromEntries(
      Object.entries(fields)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([key, value]) => {
          if (key === 'countdown') return [key, value === 'none' ? null : value];
          if (key === 'countdown_active') return [key, value == null ? false : value];
          return [key, value];
        })
    );

    const { data, error } = await supabase
      .from('fan_walls')
      .update({ ...cleanFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    console.log('✅ Fan wall updated:', id, cleanFields);

    await broadcast("wall_updated", { id, ...cleanFields });

    if (cleanFields.countdown_active && cleanFields.countdown) {
      await broadcast("countdown_started", {
        id,
        countdown: cleanFields.countdown,
        countdown_active: true,
      });
    }

    return data;
  } catch (err) {
    console.error('❌ Error updating fan wall settings:', err);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE FAN WALL                                                         */
/* -------------------------------------------------------------------------- */
export async function deleteFanWall(id: string) {
  try {
    const { error } = await supabase.from('fan_walls').delete().eq('id', id);
    if (error) throw error;

    console.log('🗑️ Fan wall deleted:', id);

    await broadcast("wall_deleted", { id });
  } catch (err) {
    console.error('❌ Error deleting fan wall:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧹 CLEAR POSTS FOR A WALL                                                  */
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
/* 🔁 TOGGLE LIVE / INACTIVE                                                 */
/* -------------------------------------------------------------------------- */
export async function toggleFanWallStatus(id: string, makeLive: boolean) {
  try {
    const status = makeLive ? 'live' : 'inactive';

    const { error } = await supabase
      .from('fan_walls')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    console.log(`🔄 Fan wall ${id} → ${status.toUpperCase()}`);

    await broadcast("wall_status_changed", { id, status });

    if (makeLive) {
      await broadcast("countdown_finished", {
        id,
        status: "live",
      });
    }
  } catch (err) {
    console.error('❌ Error toggling fan wall status:', err);
  }
}
