// /lib/syncGuest.ts
import { supabase } from '@/lib/supabaseClient';

/* -------------------------
   Get or create device ID
-------------------------- */
export function getOrCreateGuestDeviceId(): string {
  let deviceId = localStorage.getItem('faninteract_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('faninteract_device_id', deviceId);
    console.log('🧠 New device_id created:', deviceId);
  } else {
    console.log('🔁 Existing device_id:', deviceId);
  }
  return deviceId;
}

/* -------------------------
   Sync Guest Profile ONLY
-------------------------- */
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
  const deviceId = getOrCreateGuestDeviceId();
  console.log('🧠 syncGuestProfile →', { deviceId, guestData });

  // Step 1️⃣ Check if profile already exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (checkError) {
    console.error('❌ guest_profiles check error:', checkError);
  }

  // Step 2️⃣ Create or update
  let profile = existingProfile;
  if (!profile) {
    const { data: newProfile, error: insertError } = await supabase
      .from('guest_profiles')
      .insert([
        {
          device_id: deviceId,
          first_name: guestData.first_name,
          last_name: guestData.last_name,
          email: guestData.email,
          phone: guestData.phone,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert guest_profile failed:', insertError);
      throw insertError;
    }

    profile = newProfile;
    console.log('✅ Inserted guest_profile:', profile);
  } else {
    console.log('♻️ Existing profile found:', profile);
  }

  return { profile };
}
