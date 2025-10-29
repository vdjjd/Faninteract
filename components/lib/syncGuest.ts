import { supabase } from '@/lib/supabaseClient';

/* ---------- Safe local identity helper ---------- */
export function getOrCreateGuestDeviceId(): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('⚠ No localStorage — SSR or restricted mode');
      return crypto.randomUUID();
    }

    let id = localStorage.getItem('faninteract_guest_id');
    if (!id || id === 'undefined' || id === 'null') {
      id = crypto.randomUUID();
      localStorage.setItem('faninteract_guest_id', id);
      console.log('🆕 Created new device_id:', id);
    } else {
      console.log('♻️ Reusing device_id:', id);
    }
    return id;
  } catch (err) {
    console.error('❌ Error creating device_id, using fallback:', err);
    return crypto.randomUUID();
  }
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
  // ✅ Guarantee a device ID before any Supabase call
  const device_id = getOrCreateGuestDeviceId();
  if (!device_id) {
    throw new Error('🚨 Device ID could not be generated!');
  }

  console.log('🧠 Starting syncGuestProfile with device_id:', device_id);
  console.log('🔹 guestData:', guestData);

  /* 1️⃣ Try upsert to guest_profiles */
  let profile = null;
  let profileError = null;

  try {
    const { data, error } = await supabase
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

    profile = data;
    profileError = error;
  } catch (err: any) {
    console.error('❌ Supabase upsert() threw an exception:', err);
    profileError = err;
  }

  // 🚨 Fallback: if upsert failed, try plain insert
  if (profileError || !profile) {
    console.warn('⚠ Upsert failed, attempting fallback insert...');

    const { data: inserted, error: insertError } = await supabase
      .from('guest_profiles')
      .insert([
        {
          device_id,
          first_name: guestData.first_name.trim(),
          last_name: guestData.last_name?.trim() || null,
          email: guestData.email?.trim() || null,
          phone: guestData.phone?.trim() || null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Fallback insert also failed:', insertError);
      throw insertError;
    }

    profile = inserted;
    console.log('✅ Fallback insert succeeded:', profile);
  }

  if (!profile?.id) {
    console.error('🚨 No profile returned after upsert/insert!');
    throw new Error('No profile returned after sync.');
  }

  /* 2️⃣ Optional guest_visits (safe ignore if missing table) */
  try {
    const { error: visitError } = await supabase
      .from('guest_visits')
      .upsert(
        { guest_profile_id: profile.id, host_id: hostId },
        { onConflict: 'guest_profile_id,host_id' }
      );
    if (visitError) console.warn('⚠ guest_visits warning:', visitError.message);
  } catch {
    console.warn('⚠ guest_visits table missing or restricted.');
  }

  /* 3️⃣ Upsert guests record for this event */
  const { data: guestRecord, error: guestError } = await supabase
    .from('guests')
    .upsert(
      {
        event_id: eventId,
        first_name: guestData.first_name.trim(),
        last_name: guestData.last_name?.trim() || '',
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

  // ✅ Local persistence
  const profileObj = {
    id: profile.id,
    device_id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    guest_id: guestRecord.id,
  };

  try {
    localStorage.setItem('faninteract_guest_profile', JSON.stringify(profileObj));
  } catch (err) {
    console.warn('⚠ Could not store local guest profile:', err);
  }

  console.log('✅ Stored faninteract_guest_profile:', profileObj);
  return { profile, guestRecord, device_id };
}