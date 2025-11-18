import { getSupabaseClient } from "./supabaseClient";

/* ----------------------------------------
   Get or Create Device ID 
---------------------------------------- */
export function getOrCreateGuestDeviceId() {
  let deviceId = localStorage.getItem("guest_device_id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("guest_device_id", deviceId);
  }

  return deviceId;
}

/* ----------------------------------------
   SYNC GUEST PROFILE
   type = "wall" | "prizewheel" | "poll"
---------------------------------------- */
export async function syncGuestProfile(
  type: string,
  targetId: string,
  form: any
) {
  const supabase = getSupabaseClient();
  const deviceId = getOrCreateGuestDeviceId();

  // Expected fields
  const payload = {
    device_id: deviceId,
    first_name: form.first_name || "",
    last_name: form.last_name || "",
    email: form.email || "",
    phone: form.phone || "",
    street: form.street || "",
    city: form.city || "",
    state: form.state || "",
    zip: form.zip || "",
    age: form.age || "",
  };

  // Check if device already exists
  const { data: existing, error: checkError } = await supabase
    .from("guest_profiles")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking guest profile:", checkError);
  }

  let profile;

  if (existing) {
    // UPDATE EXISTING PROFILE
    const { data, error } = await supabase
      .from("guest_profiles")
      .update(payload)
      .eq("device_id", deviceId)
      .select()
      .single();

    if (error) console.error("Error updating guest:", error);
    profile = data;
  } else {
    // INSERT NEW PROFILE
    const { data, error } = await supabase
      .from("guest_profiles")
      .insert({
        ...payload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) console.error("Error creating new guest:", error);
    profile = data;
  }

  /* ----------------------------------------
     AUTO-LINK EVENT PARTICIPATION
  ---------------------------------------- */
  if (profile?.id) {
    if (type === "wall") {
      await supabase.from("fan_wall_submissions").upsert(
        {
          wall_id: targetId,
          guest_id: profile.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "wall_id,guest_id" }
      );
    }

    if (type === "prizewheel") {
      await supabase.from("wheel_participants").upsert(
        {
          wheel_id: targetId,
          guest_id: profile.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "wheel_id,guest_id" }
      );
    }

    if (type === "poll") {
      await supabase.from("poll_participants").upsert(
        {
          poll_id: targetId,
          guest_id: profile.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "poll_id,guest_id" }
      );
    }
  }

  /* ----------------------------------------
     Return Updated Profile
  ---------------------------------------- */
  return { profile };
}
