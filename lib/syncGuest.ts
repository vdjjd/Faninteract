import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧩 1. Device ID helper                                                      */
/* -------------------------------------------------------------------------- */
export function getOrCreateGuestDeviceId(): string {
  if (typeof window === 'undefined') return 'server-runtime';

  let device_id = localStorage.getItem('guest_device_id');
  if (!device_id) {
    device_id = crypto.randomUUID();
    localStorage.setItem('guest_device_id', device_id);
    console.log('🆕 Created new device_id:', device_id);
  } else {
    console.log('♻️ Using existing device_id:', device_id);
  }
  return device_id;
}

/* -------------------------------------------------------------------------- */
/* 🧠 2. Guest profile sync helper (NO guest table access)                     */
/* -------------------------------------------------------------------------- */
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
  console.log('🧠 syncGuestProfile → guest_profiles only', {
    hostId,
    eventId,
    device_id,
    guestData,
  });

  // ✅ Step 1: find existing guest_profile by device_id
  const { data: existingProfile, error: findError } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('device_id', device_id)
    .maybeSingle();

  if (findError) throw new Error(`Find guest_profile failed: ${findError.message}`);

  let profile = existingProfile;

  // ✅ Step 2: insert or update guest_profiles
  if (!profile) {
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
    console.log('✅ Created new guest_profile:', profile);
  } else {
    const { data: updatedProfile, error: updateError } = await supabase
      .from('guest_profiles')
      .update({
        first_name: guestData.first_name,
        last_name: guestData.last_name,
        email: guestData.email,
        phone: guestData.phone,
      })
      .eq('device_id', device_id)
      .select()
      .single();

    if (updateError) throw new Error(`Update guest_profile failed: ${updateError.message}`);
    profile = updatedProfile;
    console.log('♻️ Updated guest_profile:', profile);
  }

  // ✅ Step 3: return guest profile only
  return { profile };
}
