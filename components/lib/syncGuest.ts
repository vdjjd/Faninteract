import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧩 1. Exported device ID helper                                             */
/* -------------------------------------------------------------------------- */
export function getOrCreateGuestDeviceId(): string {
  if (typeof window === 'undefined') return 'server-runtime'; // avoids Next.js build error

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
/* 🧠 2. Exported profile sync helper                                          */
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
  console.log('🧠 syncGuestProfile →', { hostId, eventId, device_id, guestData });

  // Step 1: find or create guest_profile
  const { data: existingProfile } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('device_id', device_id)
    .maybeSingle();

  let profile = existingProfile;
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
  }

  // Step 2: link to guests table
  const { data: existingGuest } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .eq('guest_profile_id', profile.id)
    .maybeSingle();

  if (!existingGuest) {
    const { error: linkError } = await supabase.from('guests').insert([
      {
        event_id: eventId,
        guest_profile_id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
      },
    ]);
    if (linkError) throw new Error(`Insert guest failed: ${linkError.message}`);
  }

  return { profile };
}
