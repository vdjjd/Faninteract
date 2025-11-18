'use server';

import { supabaseAdmin } from '@/lib/supabaseClient';
const supabase = supabaseAdmin!;

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE POLL (server only)                                               */
/* -------------------------------------------------------------------------- */
export async function createPoll(hostId: string, data: any) {
  try {
    const { question, options = [] } = data;

    const newPoll = {
      host_id: hostId,
      question: question || 'Untitled Poll',
      status: 'inactive',
      background_type: 'gradient',
      background_value: 'linear-gradient(135deg,#0d47a1,#1976d2)',
      layout: 'horizontal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // ✅ Create base poll
    const { data: created, error } = await supabase
      .from('polls')
      .insert([newPoll])
      .select()
      .maybeSingle();

    if (error || !created) {
      console.error('❌ Error creating poll:', error?.message || error);
      return null;
    }

    // ✅ Add QR link using correct plural path
    const qrUrl = `https://faninteract.vercel.app/polls/${created.id}`;

    const { data: updated, error: updateError } = await supabase
      .from('polls')
      .update({ qr_url: qrUrl, updated_at: new Date().toISOString() })
      .eq('id', created.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.warn('⚠️ Poll created but failed to save QR URL:', updateError.message);
    }

    // ✅ Insert options if provided
    if (options.length > 0) {
      const cleanOptions = options
        .map((opt: string) => opt.trim())
        .filter(Boolean)
        .map((opt: string) => ({
          poll_id: created.id,
          option_text: opt,
          vote_count: 0,
        }));

      if (cleanOptions.length >= 2) {
        const { error: optionError } = await supabase
          .from('poll_options')
          .insert(cleanOptions);
        if (optionError) console.error('⚠️ Error inserting poll options:', optionError.message);
      }
    }

    console.log('✅ Poll created successfully:', updated?.id || created.id);
    return updated || created;
  } catch (err) {
    console.error('❌ Error creating poll:', err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔍 GET POLLS BY HOST (server only)                                         */
/* -------------------------------------------------------------------------- */
export async function getPollsByHost(hostId: string) {
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching polls by host:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ Unexpected error fetching polls by host:', err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE POLL (server only)                                               */
/* -------------------------------------------------------------------------- */
export async function deletePoll(pollId: string) {
  try {
    // Delete associated options first (avoid FK issues)
    await supabase.from('poll_options').delete().eq('poll_id', pollId);

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
    // Delete all votes tied to this poll
    const { error: voteError } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId);
    if (voteError) throw voteError;

    // Reset all option counts to 0
    const { error: resetError } = await supabase
      .from('poll_options')
      .update({ vote_count: 0 })
      .eq('poll_id', pollId);
    if (resetError) throw resetError;

    // Set poll back to inactive
    const { error: updateError } = await supabase
      .from('polls')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pollId);
    if (updateError) throw updateError;

    console.log(`🧹 Cleared poll ${pollId}`);
  } catch (err) {
    console.error('❌ Error clearing poll:', err);
  }
}
