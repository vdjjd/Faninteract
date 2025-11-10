"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { syncGuestProfile, getOrCreateGuestDeviceId } from "@/lib/syncGuest";

export default function PrizeWheelSignupPage() {
  const router = useRouter();
  const params = useParams();
  const wheelId = Array.isArray(params.wheelId)
    ? params.wheelId[0]
    : (params.wheelId as string);

  const supabase = getSupabaseClient();

  const [wheel, setWheel] = useState<any>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ✅ Ensure device ID exists */
  useEffect(() => {
    getOrCreateGuestDeviceId();
  }, []);

  /* ✅ Load wheel info (background + title + host logo) */
  useEffect(() => {
    async function loadWheel() {
      if (!wheelId) return;
      const { data } = await supabase
        .from("prize_wheels")
        .select("title, background_type, background_value, host:host_id (branding_logo_url)")
        .eq("id", wheelId)
        .single();

      setWheel(data);
    }
    loadWheel();
  }, [wheelId, supabase]);

  /* ✅ Smart redirect if already signed up */
  useEffect(() => {
    async function checkProfile() {
      const deviceId = localStorage.getItem("guest_device_id");
      const stored = localStorage.getItem("guest_profile");

      if (!deviceId || !stored) return; // Not signed in → show signup

      // Validate against DB
      const { data } = await supabase
        .from("guest_profiles")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (!data) {
        localStorage.removeItem("guest_profile");
        return;
      }

      // ✅ Already signed up → redirect to submit
      router.push(`/prizewheel/${wheelId}/submit`);
    }

    checkProfile();
  }, [wheelId, router, supabase]);

  /* ✅ Submit */
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!agree) return alert("Please agree to the terms.");
    if (!wheelId) return alert("Missing Prize Wheel ID.");

    try {
      setSubmitting(true);

      const { profile } = await syncGuestProfile("", wheelId, form);

      localStorage.setItem("guest_profile", JSON.stringify(profile));

      router.push(`/prizewheel/${wheelId}/submit`);
    } catch (err) {
      console.error(err);
      alert("Error saving info.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!wheel) return null;

  const bg =
    wheel.background_type === "image" &&
    wheel.background_value?.startsWith("http")
      ? `url(${wheel.background_value})`
      : wheel.background_value ||
        "linear-gradient(135deg,#0a2540,#1b2b44,#000000)";

  const logo =
    wheel.host?.branding_logo_url?.trim()
      ? wheel.host.branding_logo_url
      : "/faninteractlogo.png";

  return (
    <main
      className={cn(
        "relative flex items-center justify-center min-h-screen w-full overflow-hidden text-white"
      )}
    >
      {/* ✅ Background */}
      <div
        className={cn('absolute', 'inset-0', 'bg-cover', 'bg-center')}
        style={{ backgroundImage: bg }}
      />

      {/* ✅ Dim & blur layer */}
      <div className={cn('absolute', 'inset-0', 'bg-black/60', 'backdrop-blur-md')} />

      {/* ✅ Signup card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={cn('relative', 'z-10', 'w-[95%]', 'max-w-md', 'rounded-2xl', 'p-8', 'shadow-[0_0_40px_rgba(0,150,255,0.25)]', 'border', 'border-white/10', 'bg-white/10', 'backdrop-blur-lg')}
      >
        {/* ✅ Logo */}
        <div className={cn('flex', 'justify-center', 'mb-6')}>
          <Image
            src={logo}
            alt="Prize Wheel"
            width={360}
            height={120}
            className={cn('w-[240px]', 'md:w-[320px]', 'drop-shadow-[0_0_32px_rgba(56,189,248,0.4)]')}
          />
        </div>

        {/* ✅ Title */}
        <motion.h2
          animate={{
            textShadow: [
              "0 0 12px rgba(56,189,248,0.9)",
              "0 0 28px rgba(56,189,248,0.6)",
              "0 0 12px rgba(56,189,248,0.9)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={cn('text-center', 'text-2xl', 'font-semibold', 'text-sky-300', 'mb-6')}
        >
          Join the Prize Wheel
        </motion.h2>

        {/* ✅ Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {["first_name", "last_name", "email", "phone"].map((field) => (
            <input
              key={field}
              name={field}
              required={field === "first_name" || field === "last_name"}
              type={field === "email" ? "email" : "text"}
              placeholder={
                field === "first_name"
                  ? "First Name *"
                  : field === "last_name"
                  ? "Last Name *"
                  : field === "email"
                  ? "Email (optional)"
                  : "Phone (optional)"
              }
              value={(form as any)[field]}
              onChange={(e) =>
                setForm({ ...form, [e.target.name]: e.target.value })
              }
              className={cn('w-full', 'p-3', 'rounded-xl', 'bg-black/40', 'border', 'border-white/20', 'focus:border-sky-400', 'outline-none')}
            />
          ))}

          {/* ✅ Terms */}
          <label className={cn('flex', 'items-center', 'gap-2', 'text-sm', 'text-gray-300', 'mt-2')}>
            <input
              type="checkbox"
              className={cn('w-4', 'h-4', 'accent-sky-400')}
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            I agree to the{" "}
            <a href="/terms" target="_blank" className={cn('text-sky-400', 'underline')}>
              Terms
            </a>
          </label>

          {/* ✅ Button */}
          <button
            disabled={submitting}
            className={cn('w-full', 'py-3', 'rounded-xl', 'bg-gradient-to-r', 'from-sky-500', 'to-blue-600', 'font-semibold', 'shadow-lg', 'hover:scale-[1.03]', 'active:scale-[0.97]', 'transition-all')}
          >
            {submitting ? "Submitting..." : "Continue"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
