import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🔹 1. Generate or reuse device_id (universal identifier)                   */
/* -------------------------------------------------------------------------- */
export function getOrCreateGuestDeviceId(): string {
  if (typeof window === 'undefined') return 'server-runtime'; // SSR safeguard

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
/* 🧠 2. Sync guest_profiles table ONLY                                       */
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
  console.log('🧠 syncGuestProfile (guest_profiles only) →', {
    hostId,
    eventId,
    device_id,
    guestData,
  });

  // 1️⃣ Find existing profile
  const { data: existingProfile, error: findError } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('device_id', device_id)
    .maybeSingle();

  if (findError) {
    console.error('❌ Error finding guest_profile:', findError.message);
    throw findError;
  }

  let profile;

  // 2️⃣ Insert or update
  if (!existingProfile) {
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

    if (insertError) {
      console.error('❌ Insert guest_profile failed:', insertError.message);
      throw insertError;
    }

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

    if (updateError) {
      console.error('❌ Update guest_profile failed:', updateError.message);
      throw updateError;
    }

    profile = updatedProfile;
    console.log('♻️ Updated guest_profile:', profile);
  }

  // 3️⃣ Return the profile (used by signup page + future features)
  return { profile };
}
