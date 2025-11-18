"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* Guest profile loader */
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

/* Local device vote lock */
function hasVoted(pollId: string) {
  return localStorage.getItem(`voted_${pollId}`) === "true";
}

function setVoted(pollId: string) {
  localStorage.setItem(`voted_${pollId}`, "true");
}

export default function VotePage() {
  const router = useRouter();
  const params = useParams();
  const pollId = Array.isArray(params.pollId) ? params.pollId[0] : params.pollId;

  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* Require guest */
  useEffect(() => {
    const profile = getStoredGuestProfile();
    if (!profile) {
      router.push(`/guest/signup?redirect=/polls/${pollId}/vote`);
      return;
    }
  }, []);

  /* Load poll + options */
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

  /* Realtime poll status only */
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

  /* Submit Vote — READ → ADD 1 → UPDATE */
  async function submitVote(optionId: string) {
    if (submitting) return;
    if (hasVoted(pollId)) {
      alert("You already voted in this poll.");
      return;
    }

    setSubmitting(true);

    // 1️⃣ Get current vote count
    const { data: optionRow, error: fetchError } = await supabase
      .from("poll_options")
      .select("vote_count")
      .eq("id", optionId)
      .single();

    if (fetchError) {
      console.error(fetchError);
      alert("Could not read current votes.");
      setSubmitting(false);
      return;
    }

    const newCount = (optionRow.vote_count || 0) + 1;

    // 2️⃣ Update with +1
    const { error: updateError } = await supabase
      .from("poll_options")
      .update({ vote_count: newCount })
      .eq("id", optionId);

    if (updateError) {
      console.error(updateError);
      alert("Vote failed.");
      setSubmitting(false);
      return;
    }

    // 3️⃣ Lock vote on device
    setVoted(pollId);

    setSubmitting(false);
    router.push(`/thanks/${pollId}`);
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
      }}
    >
      <h1
        style={{
          color: "white",
          fontWeight: 900,
          marginBottom: "2vh",
          textAlign: "center",
          fontSize: "clamp(1.4rem, 6vw, 3rem)",
          textShadow: "3px 3px 8px #000",
        }}
      >
        {poll.question}
      </h1>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {options.map((opt: any) => (
          <button
            key={opt.id}
            disabled={!isActive || hasVoted(pollId)}
            onClick={() => submitVote(opt.id)}
            style={{
              background: opt.bar_color,
              opacity: isActive && !hasVoted(pollId) ? 1 : 0.35,
              padding: "18px",
              width: "100%",
              marginBottom: "1rem",
              borderRadius: 16,
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#fff",
              border: "none",
              cursor:
                isActive && !hasVoted(pollId) ? "pointer" : "not-allowed",
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
