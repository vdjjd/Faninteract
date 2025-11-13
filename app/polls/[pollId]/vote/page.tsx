"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* Retrieve saved guest profile */
function getStoredGuestProfile() {
  try {
    const raw =
      localStorage.getItem("guest_profile") ||
      localStorage.getItem("guestInfo");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function VotePage() {
  const router = useRouter();
  const params = useParams();
  const pollId = Array.isArray(params.pollId) ? params.pollId[0] : params.pollId;

  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* -------------------------------------------------- */
  /* 1. Require guest profile                           */
  /* -------------------------------------------------- */
  useEffect(() => {
    const profile = getStoredGuestProfile();
    if (!profile) {
      router.push(`/guest/signup?redirect=/polls/${pollId}/vote`);
      return;
    }
  }, []);

  /* -------------------------------------------------- */
  /* 2. Load poll + options                             */
  /* -------------------------------------------------- */
  async function loadEverything() {
    const { data: pollData } = await supabase
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .maybeSingle();

    const { data: opts } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollId);

    setPoll(pollData);
    setOptions(opts || []);
    setLoading(false);
  }

  useEffect(() => {
    loadEverything();
  }, [pollId]);

  /* -------------------------------------------------- */
  /* 3. Realtime status updates                         */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!pollId) return;

    const channel = supabase
      .channel(`poll-${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "polls",
          filter: `id=eq.${pollId}`,
        },
        (payload: any) => {
          setPoll(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId]);

  /* -------------------------------------------------- */
  /* 4. Submit vote                                     */
  /* -------------------------------------------------- */
  async function submitVote(optionId: string) {
    if (submitting) return;
    setSubmitting(true);

    const profile = getStoredGuestProfile();
    if (!profile) {
      router.push(`/guest/signup?redirect=/polls/${pollId}/vote`);
      return;
    }

    const { error } = await supabase.from("poll_votes").insert({
      poll_id: pollId,
      option_id: optionId,
      guest_profile_id: profile.id,
    });

    if (error) {
      console.error("❌ Vote insert error:", error);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push(`/polls/${pollId}/thanks`);
  }

  /* -------------------------------------------------- */
  /* Render states                                      */
  /* -------------------------------------------------- */
  if (loading) return <div style={{ color: "#fff" }}>Loading…</div>;
  if (!poll) return <div style={{ color: "#fff" }}>Poll not found.</div>;

  const isActive = poll.status === "active";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: poll.background_value || "#111",
        filter: `brightness(${poll.background_brightness || 100}%)`,
        padding: "4vh 4vw",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Title */}
      <h1
        style={{
          color: "white",
          fontWeight: 900,
          marginBottom: "2vh",
          textShadow: "3px 3px 8px #000",
          textAlign: "center",
          fontSize: "clamp(1.4rem, 6vw, 3rem)",
          lineHeight: 1.15,
          wordBreak: "break-word",
          overflowWrap: "break-word",
          hyphens: "auto",
          maxWidth: "95%",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {poll.question}
      </h1>

      {/* Voting Options */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {options.map((opt: any) => (
          <button
            key={opt.id}
            disabled={!isActive}
            onClick={() => submitVote(opt.id)}
            style={{
              background: opt.bar_color,
              opacity: isActive ? 1 : 0.4,
              padding: "18px",
              width: "100%",
              marginBottom: "1rem",
              borderRadius: 16,
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#fff",
              border: "none",
              boxShadow: "0 0 25px rgba(0,0,0,0.6)",
              cursor: isActive ? "pointer" : "default",
              wordBreak: "break-word",
              transition: "0.2s",
            }}
          >
            {opt.option_text}
          </button>
        ))}
      </div>

      {/* INACTIVE OVERLAY — FIXED */}
      {!isActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            /* ⭐ FIX: overlay does NOT block buttons */
            pointerEvents: "none",
          }}
        >
          <h1
            style={{
              color: "red",
              fontSize: "4rem",
              fontWeight: 900,
              textShadow: "0 0 30px #000",
              textAlign: "center",
              padding: "0 20px",
              lineHeight: 1.1,
            }}
          >
            Voting Not Active Yet
          </h1>
        </div>
      )}
    </div>
  );
}
