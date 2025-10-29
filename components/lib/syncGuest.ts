import { supabase } from '@/lib/supabaseClient';

/* ---------- Device ID Helper ---------- */
export function getOrCreateGuestDeviceId(): string {
  // Try to reuse existing device_id
  let device_id = localStorage.getItem('guest_device_id');
  if (!device_id) {
    device_id = crypto.randomUUID();
    localStorage.setItem('guest_device_id', device_id);
    console.log('🆕 Created new device_id:', device_id);
  } else {
    console.log('♻️ Reusing existing device_id:', device_id);
  }
  return device_id;
}

/* ---------- Main Sync Function ---------- */
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

  console.log('🧠 syncGuestProfile →', { hostId, eventId, device_id, guestData });

  /* --- Step 1: Ensure guest_profiles record --- */
  const { data: existingProfile, error: fetchError } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('device_id', device_id)
    .maybeSingle();

  if (fetchError) throw new Error(`Fetch guest_profile failed: ${fetchError.message}`);

  let profile = existingProfile;

  if (!profile) {
    console.log('🆕 Creating new guest_profile...');
    const { data: newProfile, error: insertError } = await supabase
      .from('guest_profiles')
      .insert([
        {
          device_id,
          first_name: guestData.first_name,
          last_name: guestData.last_name,
          email: guestData.email,
          phone: guestData.phone,
        },
      ])
      .select()
      .single();

    if (insertError) throw new Error(`Insert guest_profile failed: ${insertError.message}`);
    profile = newProfile;
  } else {
    console.log('✅ Found existing guest_profile:', profile.id);
  }

  /* --- Step 2: Ensure guests event link --- */
  const { data: existingGuest } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .eq('guest_profile_id', profile.id)
    .maybeSingle();

  let guestRecord = existingGuest;

  if (!guestRecord) {
    console.log('🆕 Linking guest to event...');
    const { data: newGuest, error: linkError } = await supabase
      .from('guests')
      .insert([
        {
          event_id: eventId,
          guest_profile_id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
        },
      ])
      .select()
      .single();

    if (linkError) throw new Error(`Insert guest record failed: ${linkError.message}`);
    guestRecord = newGuest;
  } else {
    console.log('✅ Existing guest link found:', guestRecord.id);
  }

  return { profile, guestRecord };
}