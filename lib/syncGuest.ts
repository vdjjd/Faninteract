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
   Sync Guest Profile
   (global + event-level)
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

  // 1️⃣ Try to find existing profile
  const { data: existingProfile } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();

  let profile;
  if (existingProfile) {
    const { data: updated } = await supabase
      .from('guest_profiles')
      .update({
        first_name: guestData.first_name,
        last_name: guestData.last_name,
        email: guestData.email,
        phone: guestData.phone,
      })
      .eq('device_id', deviceId)
      .select()
      .single();
    profile = updated;
    console.log('🔁 Updated guest_profile:', profile);
  } else {
    const { data: inserted, error: insertError } = await supabase
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
    if (insertError) throw insertError;
    profile = inserted;
    console.log('✅ Created new guest_profile:', profile);
  }

  // 2️⃣ Create event-specific guest link
  const { data: guestRecord, error: guestError } = await supabase
    .from('guests')
    .insert([
      {
        event_id: eventId,
        first_name: guestData.first_name,
        last_name: guestData.last_name,
        email: guestData.email,
        phone: guestData.phone,
        guest_profile_id: profile.id,
      },
    ])
    .select()
    .single();

  if (guestError) throw guestError;
  console.log('🎯 Linked guest to event:', guestRecord);

  return { profile, guestRecord };
}
