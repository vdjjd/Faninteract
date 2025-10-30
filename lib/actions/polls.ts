'use server';

import { supabaseAdmin } from '@/lib/supabaseClient';
const supabase = supabaseAdmin!;

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE POLL (server only)                                               */
/* -------------------------------------------------------------------------- */
export async function createPoll(hostId: string, data: any) {
  try {
    const { title } = data;

    const newPoll = {
      host_id: hostId,
      title: title || 'Untitled Poll',
      host_title: title || 'Untitled Poll',
      status: 'inactive',
      background_type: 'gradient',
      background_value: 'linear-gradient(135deg,#0d47a1,#1976d2)',
      layout: 'horizontal',
      options: data.options || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase
      .from('polls')
      .insert([newPoll])
      .select()
      .maybeSingle();

    if (error || !created) {
      console.error('❌ Error creating poll:', error?.message || error);
      return null;
    }

    const qrUrl = `https://faninteract.vercel.app/poll/${created.id}`;

    const { data: updated, error: updateError } = await supabase
      .from('polls')
      .update({ qr_url: qrUrl, updated_at: new Date().toISOString() })
      .eq('id', created.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.warn('⚠️ Poll created but failed to save QR URL:', updateError.message);
      return created;
    }

    console.log('✅ Poll created successfully:', updated?.id);
    return updated;
  } catch (err) {
    console.error('❌ Error creating poll:', err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE POLL (server only)                                               */
/* -------------------------------------------------------------------------- */
export async function deletePoll(pollId: string) {
  try {
    const { error } = await supabase.from('polls').delete().eq('id', pollId);
    if (error) throw error;
    console.log(`🗑️ Poll ${pollId} deleted`);
  } catch (err) {
    console.error('❌ Error deleting poll:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧹 CLEAR POLL VOTES (server only)                                          */
/* -------------------------------------------------------------------------- */
export async function clearPoll(pollId: string) {
  try {
    const { error: voteError } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId);
    if (voteError) throw voteError;

    const { data: pollData, error: fetchError } = await supabase
      .from('polls')
      .select('options')
      .eq('id', pollId)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const resetOptions = (pollData?.options || []).map((o: any) => ({ ...o, votes: 0 }));

    const { error: updateError } = await supabase
      .from('polls')
      .update({
        options: resetOptions,
        status: 'inactive',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pollId);
    if (updateError) throw updateError;

    console.log(`🧹 Cleared poll ${pollId}`);
  } catch (err) {
    console.error('❌ Error clearing poll:', err);
  }
}
