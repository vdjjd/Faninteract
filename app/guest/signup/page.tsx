"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { syncGuestProfile, getOrCreateGuestDeviceId } from "@/lib/syncGuest";

export default function GuestSignupPage() {
  const router = useRouter();
  const params = useSearchParams();

  /* ✅ Universal redirect */
  const redirect = params.get("redirect");      // can be /wall/... or /prizewheel/...
  const wallId = params.get("wall");            // legacy fan wall flow
  const wheelId = params.get("prizewheel");     // prize wheel flow

  const supabase = getSupabaseClient();

  const [wall, setWall] = useState<any>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ✅ Always ensure device id exists */
  useEffect(() => {
    getOrCreateGuestDeviceId();
  }, []);

  /* ✅ Load wall background ONLY for wall signups */
  useEffect(() => {
    async function loadWall() {
      if (!wallId) return;

      const { data } = await supabase
        .from("fan_walls")
        .select("title, background_value")
        .eq("id", wallId)
        .single();

      setWall(data);
    }
    loadWall();
  }, [wallId, supabase]);

  /* ✅ Smart redirect: if device already has a profile */
  useEffect(() => {
    async function validateGuest() {
      const deviceId = localStorage.getItem("guest_device_id");
      const cached = localStorage.getItem("guest_profile");

      if (!deviceId || !cached) return;

      // Make sure DB still has this profile
      const { data } = await supabase
        .from("guest_profiles")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (!data) {
        localStorage.removeItem("guest_profile");
        return;
      }

      // ✅ Redirect priority:
      // 1. redirect=/whatever
      if (redirect) {
        router.push(redirect);
        return;
      }

      // 2. Fan wall
      if (wallId) {
        router.push(`/wall/${wallId}/submit`);
        return;
      }

      // 3. Prize wheel
      if (wheelId) {
        router.push(`/prizewheel/${wheelId}/submit`);
        return;
      }
    }

    validateGuest();
  }, [redirect, wallId, wheelId, router, supabase]);

  /* ✅ Submit handler */
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!agree) return alert("You must agree to continue.");

    try {
      setSubmitting(true);

      // ✅ Use redirect OR wallId OR wheelId for profile sync
      const targetId =
        wallId || wheelId || redirect?.match(/([0-9a-fA-F-]{36})/)?.[0];

      if (!targetId) {
        alert("Missing Target ID.");
        return;
      }

      const { profile } = await syncGuestProfile("", targetId, form);

      localStorage.setItem("guest_profile", JSON.stringify(profile));

      // ✅ Redirect priority:
      if (redirect) {
        router.push(redirect);
      } else if (wallId) {
        router.push(`/wall/${wallId}/submit`);
      } else if (wheelId) {
        router.push(`/prizewheel/${wheelId}/submit`);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving guest info");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className={cn(
        "relative flex items-center justify-center min-h-screen w-full overflow-hidden text-white"
      )}
    >
      {/* ✅ Background (only for wall signups) */}
      <div
        className={cn("absolute inset-0 bg-cover bg-center")}
        style={{
          backgroundImage: wall?.background_value?.includes("http")
            ? `url(${wall.background_value})`
            : wall?.background_value ||
              "linear-gradient(135deg,#0a2540,#1b2b44,#000000)",
        }}
      />

      {/* ✅ Dim & Blur */}
      <div
        className={cn(
          "absolute",
          "inset-0",
          "bg-black/60",
          "backdrop-blur-md"
        )}
      />

      {/* ✅ Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "relative z-10 w-[95%] max-w-md rounded-2xl p-8 shadow-[0_0_40px_rgba(0,150,255,0.25)] border border-white/10 bg-white/10 backdrop-blur-lg"
        )}
      >
        {/* ✅ Logo */}
        <div className={cn("flex", "justify-center", "mb-6")}>
          <Image
            src="/faninteractlogo.png"
            alt="FanInteract"
            width={360}
            height={120}
            className={cn(
              "w-[240px]",
              "md:w-[320px]",
              "drop-shadow-[0_0_32px_rgba(56,189,248,0.4)]"
            )}
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
          className={cn(
            "text-center",
            "text-2xl",
            "font-semibold",
            "text-sky-300",
            "mb-6"
          )}
        >
          Join the Fan Zone
        </motion.h2>

        {/* ✅ Signup Form */}
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
              className={cn(
                "w-full",
                "p-3",
                "rounded-xl",
                "bg-black/40",
                "border",
                "border-white/20",
                "focus:border-sky-400",
                "outline-none"
              )}
            />
          ))}

          {/* ✅ Terms */}
          <label
            className={cn(
              "flex",
              "items-center",
              "gap-2",
              "text-sm",
              "text-gray-300",
              "mt-2"
            )}
          >
            <input
              type="checkbox"
              className={cn("w-4", "h-4", "accent-sky-400")}
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            I agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              className={cn("text-sky-400", "underline")}
            >
              Terms
            </a>
          </label>

          {/* ✅ Submit Button */}
          <button
            disabled={submitting}
            className={cn(
              "w-full",
              "py-3",
              "rounded-xl",
              "bg-gradient-to-r",
              "from-sky-500",
              "to-blue-600",
              "font-semibold",
              "shadow-lg",
              "hover:scale-[1.03]",
              "active:scale-[0.97]",
              "transition-all"
            )}
          >
            {submitting ? "Submitting..." : "Continue"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
