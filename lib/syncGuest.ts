'use client';

import { supabase } from '@/lib/supabaseClient';

/* ---------- Local identity helper ---------- */
export function getOrCreateGuestDeviceId(): string {
  if (typeof window === 'undefined') return ''; // guard for SSR
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
  if (!guestData.first_name?.trim()) {
    throw new Error('Missing first name for guest');
  }

  const device_id = getOrCreateGuestDeviceId();
  if (!device_id) {
    console.error('❌ Could not generate or load device_id');
    throw new Error('Device ID unavailable');
  }

  // 1️⃣ Upsert into guest_profiles
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

  if (profileError || !profile) {
    console.error('❌ guest_profiles error:', profileError);
    throw profileError;
  }

  // 2️⃣ Record visit (optional analytics)
  const { error: visitError } = await supabase
    .from('guest_visits')
    .upsert(
      {
        guest_profile_id: profile.id,
        host_id: hostId,
      },
      { onConflict: 'guest_profile_id,host_id' }
    );

  if (visitError) console.warn('⚠ guest_visits error:', visitError);

  // 3️⃣ Upsert into guests (per-event)
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

  if (guestError || !guestRecord) {
    console.error('❌ guests error:', guestError);
    throw guestError;
  }

  // 4️⃣ Save local identity for Fan Zone auto-fill
  try {
    localStorage.setItem(
      'guestProfile',
      JSON.stringify({
        id: profile.id,
        device_id,
        first_name: profile.first_name,
        guest_id: guestRecord.id,
      })
    );
    console.log('✅ guestProfile saved locally:', {
      id: profile.id,
      first_name: profile.first_name,
    });
  } catch (e) {
    console.error('⚠ localStorage save failed:', e);
  }

  return { profile, guestRecord, device_id };
}
