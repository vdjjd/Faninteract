'use server';

import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE A NEW POLL                                                       */
/* -------------------------------------------------------------------------- */
export async function createPoll(hostId: string, data: any) {
  const { title } = data;

  const newPoll = {
    host_id: hostId,
    title: title || 'Untitled Poll',
    status: 'inactive',
    background_type: 'gradient',
    background_value: 'linear-gradient(135deg,#0d47a1,#1976d2)',
    layout: 'horizontal',
    options: data.options || [],
  };

  const { data: created, error } = await supabase
    .from('polls')
    .insert(newPoll)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating poll:', error);
    return null;
  }

  console.log('✅ Poll created:', created);
  return created;
}

/* -------------------------------------------------------------------------- */
/* 🟡 GET POLLS BY HOST                                                       */
/* -------------------------------------------------------------------------- */
export async function getPollsByHost(hostId: string) {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching polls:', error);
    return [];
  }

  return data || [];
}

/* -------------------------------------------------------------------------- */
/* 🔵 UPDATE POLL SETTINGS                                                    */
/* -------------------------------------------------------------------------- */
export async function updatePoll(pollId: string, updates: any) {
  const { data, error } = await supabase
    .from('polls')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', pollId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating poll:', error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE POLL                                                             */
/* -------------------------------------------------------------------------- */
export async function deletePoll(pollId: string) {
  const { error } = await supabase.from('polls').delete().eq('id', pollId);
  if (error) console.error('❌ Error deleting poll:', error);
  else console.log(`🗑️ Poll ${pollId} deleted`);
}

/* -------------------------------------------------------------------------- */
/* 🧹 CLEAR POLL VOTES                                                        */
/* -------------------------------------------------------------------------- */
export async function clearPoll(pollId: string) {
  try {
    // delete all votes
    const { error: voteError } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId);
    if (voteError) throw voteError;

    // reset vote counts in poll options
    const { data: pollData, error: fetchError } = await supabase
      .from('polls')
      .select('options')
      .eq('id', pollId)
      .single();

    if (fetchError) throw fetchError;

    const resetOptions = (pollData?.options || []).map((o: any) => ({
      ...o,
      votes: 0,
    }));

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
export async function addVote(pollId: string, optionId: number, voterHash: string) {
  try {
    // check if this voter has already voted
    const { data: existing } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('voter_hash', voterHash)
      .single();

    if (existing) {
      console.warn('⚠️ Duplicate vote detected — ignoring.');
      return null;
    }

    // insert new vote
    const { error: insertError } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, voter_hash: voterHash });

    if (insertError) throw insertError;

    // increment count in poll.options JSON
    const { data: pollData, error: fetchError } = await supabase
      .from('polls')
      .select('options')
      .eq('id', pollId)
      .single();

    if (fetchError) throw fetchError;

    const updatedOptions = (pollData?.options || []).map((o: any) =>
      o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
    );

    const { error: updateError } = await supabase
      .from('polls')
      .update({ options: updatedOptions, updated_at: new Date().toISOString() })
      .eq('id', pollId);

    if (updateError) throw updateError;

    console.log(`✅ Vote added for option ${optionId} in poll ${pollId}`);
  } catch (err) {
    console.error('❌ Error adding vote:', err);
  }
}
