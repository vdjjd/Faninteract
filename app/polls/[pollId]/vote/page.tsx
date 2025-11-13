"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

  useEffect(() => {
    const profile = getStoredGuestProfile();
    if (!profile) {
      router.push(`/guest/signup?redirect=/polls/${pollId}/vote`);
      return;
    }
  }, []);

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
              opacity: isActive ? 1 : 0.35,
              padding: "18px",
              width: "100%",
              marginBottom: "1rem",
              borderRadius: 16,
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#fff",
              border: "none",
              cursor: isActive ? "pointer" : "not-allowed",
              boxShadow: "0 0 25px rgba(0,0,0,0.6)",
              transition: "0.2s",
            }}
          >
            {opt.option_text}
          </button>
        ))}
      </div>
    </div>
  );
}
