async function handleStart(id: string) {
  const { data } = await supabase
    .from('polls')
    .select('countdown')
    .eq('id', id)
    .single();

  const hasCountdown =
    data?.countdown && data.countdown !== 'none' && data.countdown !== null;

  if (hasCountdown) {
    // 🕒 Start countdown mode
    await supabase
      .from('polls')
      .update({
        countdown_active: true,
        status: 'inactive', // countdown page stays visible
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  } else {
    // 🚀 Start immediately
    await supabase
      .from('polls')
      .update({
        status: 'live',
        countdown_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  await refreshPolls();
}

async function handleStop(id: string) {
  await supabase
    .from('polls')
    .update({
      status: 'inactive',
      countdown_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  await refreshPolls();
}