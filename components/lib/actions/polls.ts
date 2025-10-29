'use server';

import { supabaseAdmin } from '@/lib/supabaseClient';
const supabase = supabaseAdmin!;

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE A NEW POLL WITH AUTO-GENERATED QR URL                            */
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

    // ✅ Step 1: Create poll
    const { data: created, error } = await supabase
      .from('polls')
      .insert([newPoll])
      .select()
      .maybeSingle(); // ✅ changed from .single()

    if (error || !created) {
      console.error('❌ Error creating poll:', error?.message || error);
      return null;
    }

    // ✅ Step 2: Generate QR URL
    const qrUrl = `https://faninteract.vercel.app/poll/${created.id}`;

    // ✅ Step 3: Save QR URL back
    const { data: updated, error: updateError } = await supabase
      .from('polls')
      .update({
        qr_url: qrUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', created.id)
      .select()
      .maybeSingle(); // ✅ safe version

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
/* 🟡 GET POLLS BY HOST (SAFE, NO .single())                                  */
/* -------------------------------------------------------------------------- */
export async function getPollsByHost(hostId: string) {
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching polls:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ Exception in getPollsByHost:', err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* 🔵 UPDATE POLL SETTINGS                                                    */
/* -------------------------------------------------------------------------- */
export async function updatePoll(pollId: string, updates: any) {
  try {
    const updatedData = {
      ...updates,
      host_title: updates.host_title ?? updates.title ?? 'Untitled Poll',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('polls')
      .update(updatedData)
      .eq('id', pollId)
      .select()
      .maybeSingle(); // ✅ no 406s

    if (error) throw error;

    console.log('✅ Poll updated:', pollId);
    return data;
  } catch (err) {
    console.error('❌ Error updating poll:', err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE POLL                                                             */
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
/* 🧹 CLEAR POLL VOTES                                                        */
/* -------------------------------------------------------------------------- */
export async function clearPoll(pollId: string) {
  try {
    // 1️⃣ Delete all votes
    const { error: voteError } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId);
    if (voteError) throw voteError;

    // 2️⃣ Fetch options
    const { data: pollData, error: fetchError } = await supabase
      .from('polls')
      .select('options')
      .eq('id', pollId)
      .maybeSingle(); // ✅ safe
    if (fetchError) throw fetchError;

    // 3️⃣ Reset votes
    const resetOptions = (pollData?.options || []).map((o: any) => ({
      ...o,
      votes: 0,
    }));

    // 4️⃣ Save reset
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

/* -------------------------------------------------------------------------- */
/* 🟠 ADD A VOTE                                                              */
/* -------------------------------------------------------------------------- */
export async function addVote(
  pollId: string,
  optionId: number,
  voterHash: string
) {
  try {
    // 1️⃣ Check duplicate
    const { data: existing } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('voter_hash', voterHash)
      .maybeSingle(); // ✅ safe

    if (existing) {
      console.warn('⚠️ Duplicate vote detected — ignoring.');
      return null;
    }

    // 2️⃣ Insert new vote
    const { error: insertError } = await supabase
      .from('poll_votes')
      .insert([{ poll_id: pollId, option_id: optionId, voter_hash: voterHash }]);
    if (insertError) throw insertError;

    // 3️⃣ Fetch poll options
    const { data: pollData, error: fetchError } = await supabase
      .from('polls')
      .select('options')
      .eq('id', pollId)
      .maybeSingle(); // ✅ safe
    if (fetchError) throw fetchError;

    // 4️⃣ Update votes
    const updatedOptions = (pollData?.options || []).map((o: any) =>
      o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
    );

    const { error: updateError } = await supabase
      .from('polls')
      .update({
        options: updatedOptions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pollId);
    if (updateError) throw updateError;

    console.log(`✅ Vote added for option ${optionId} in poll ${pollId}`);
  } catch (err) {
    console.error('❌ Error adding vote:', err);
  }
}