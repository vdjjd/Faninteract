import { supabase } from '@/lib/supabaseClient';

/* ---------- Local identity helper ---------- */
export function getOrCreateGuestDeviceId(): string {
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
    email?: string;
    phone?: string;
  }
) {
  const device_id = getOrCreateGuestDeviceId();

  /* 1️⃣  Upsert guest_profiles (global identity) */
  const { data: profile, error: profileError } = await supabase
    .from('guest_profiles')
    .upsert(
      {
        device_id,
        first_name: guestData.first_name.trim(),
        last_name: guestData.last_name?.trim() || null,
        email: guestData.email?.trim() || null,
        phone: guestData.phone?.trim() || null,
      },
      { onConflict: 'device_id' }
    )
    .select()
    .single();

  if (profileError) {
    console.error('❌ guest_profiles upsert error:', profileError);
    throw profileError;
  }

  /* 2️⃣  Record visit per host (optional analytics) */
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
    console.warn('⚠ guest_visits upsert warning:', visitError.message);
  }

  /* 3️⃣  Upsert guests record for this event */
  const { data: guestRecord, error: guestError } = await supabase
    .from('guests')
    .upsert(
      {
        event_id: eventId,
        first_name: guestData.first_name.trim(),
        last_name: guestData.last_name?.trim() || null,
        email: guestData.email?.trim() || null,
        phone: guestData.phone?.trim() || null,
        guest_profile_id: profile.id,
      },
      { onConflict: 'event_id,guest_profile_id' }
    )
    .select()
    .single();

  if (guestError) {
    console.error('❌ guests upsert error:', guestError);
    throw guestError;
  }

  /* 4️⃣  Store unified local identity */
  const profileObj = {
    id: profile.id,
    device_id,
    first_name: profile.first_name,
    guest_id: guestRecord.id,
  };

  // ✅ Store both profile + device_id (used later by post page)
  localStorage.setItem('faninteract_guest_profile', JSON.stringify(profileObj));
  localStorage.setItem('faninteract_guest_id', device_id);

  console.log('✅ Stored faninteract_guest_profile:', profileObj);

  return { profile, guestRecord, device_id };
}
