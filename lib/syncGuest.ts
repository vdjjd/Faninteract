import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 1️⃣  DEVICE ID HELPER — persistent per browser/device                      */
/* -------------------------------------------------------------------------- */
export function getOrCreateGuestDeviceId(): string {
  try {
    if (typeof window === 'undefined') return 'server-runtime'; // avoids Next.js build error

    let deviceId = localStorage.getItem('faninteract_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('faninteract_device_id', deviceId);
      console.log('🆕 Created new device_id:', deviceId);
    } else {
      console.log('♻️ Using existing device_id:', deviceId);
    }
    return deviceId;
  } catch (err) {
    console.error('⚠️ Failed to access localStorage:', err);
    return 'unknown-device';
  }
}

/* -------------------------------------------------------------------------- */
/* 2️⃣  SYNC GUEST PROFILE + EVENT LINK                                       */
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
  const deviceId = getOrCreateGuestDeviceId();
  console.log('🧠 syncGuestProfile starting →', { hostId, eventId, deviceId, guestData });

  /* ---------- STEP 1: Find existing guest_profile ---------- */
  const { data: existingProfile, error: selectErr } = await supabase
    .from('guest_profiles')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (selectErr) console.error('⚠️ guest_profiles select error:', selectErr);
  console.log('🔍 Existing profile check raw:', existingProfile);

  /* ---------- STEP 2: Create or update guest_profile ---------- */
  let profile: any = null;

  if (existingProfile && typeof existingProfile === 'object' && existingProfile.id) {
    console.log('🔁 Updating existing guest_profile:', existingProfile.id);
    const { data: updated, error: updateErr } = await supabase
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

    if (updateErr) throw new Error(`guest_profiles update failed: ${updateErr.message}`);
    profile = updated;
  } else {
    console.log('🆕 No existing profile found → INSERTING');
    const { data: inserted, error: insertErr } = await supabase
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

    if (insertErr) {
      console.error('❌ guest_profiles insert failed:', insertErr);
      throw insertErr;
    }

    profile = inserted;
    console.log('✅ Created new guest_profile:', profile);
  }

  /* ---------- STEP 3: Link this profile to the event ---------- */
  console.log('🔗 Linking guest_profile to event:', eventId);

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

  if (guestError) {
    console.error('❌ guests insert failed:', guestError);
    throw guestError;
  }

  console.log('🎯 guests link created:', guestRecord);

  return { profile, guestRecord };
}

