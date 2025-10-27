import { supabase } from '@/lib/supabaseClient';

/* ---------- Local identity helpers ---------- */
function getOrCreateGuestDeviceId(): string {
  let id = localStorage.getItem('faninteract_guest_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('faninteract_guest_id', id);
  }
  return id;
}

/* ---------- Sync / create global guest ---------- */
export async function syncGuestProfile(
  hostId: string,
  eventId: string,
  guestData: {
    first_name: string;
    last_name?: string;
    nickname?: string;
  }
) {
  const device_id = getOrCreateGuestDeviceId();

  /* ----- 1. Create or update global guest_profiles ----- */
  const { data: profile, error: profileError } = await supabase
    .from('guest_profiles')
    .upsert(
      {
        device_id,
        first_name: guestData.first_name,
        last_name: guestData.last_name || null,
        nickname: guestData.nickname || null,
      },
      { onConflict: 'device_id' }
    )
    .select()
    .single();

  if (profileError) {
    console.error('❌ Error upserting guest_profile:', profileError);
    throw profileError;
  }

  /* ----- 2. Log / update guest_visits for this host ----- */
  const { error: visitError } = await supabase
    .from('guest_visits')
    .upsert(
      {
        guest_profile_id: profile.id,
        host_id: hostId,
      },
      { onConflict: 'guest_profile_id,host_id' }
    );

  if (visitError) {
    console.error('❌ Error upserting guest_visit:', visitError);
    throw visitError;
  }

  /* ----- 3. Upsert guests record for this event ----- */
  const { data: guestRecord, error: guestError } = await supabase
    .from('guests')
    .upsert(
      {
        event_id: eventId,
        first_name: guestData.first_name,
        last_name: guestData.last_name || null,
        nickname: guestData.nickname || null,
        guest_profile_id: profile.id,
      },
      { onConflict: 'event_id,guest_profile_id' }
    )
    .select()
    .single();

  if (guestError) {
    console.error('❌ Error upserting guest:', guestError);
    throw guestError;
  }

  return {
    profile,       // global guest_profiles row
    guestRecord,   // per-event guest row
    device_id,     // local device identity
  };
}
