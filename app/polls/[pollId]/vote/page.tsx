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
  const [alreadyVoted, setAlreadyVoted] = useState(false);

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
    const profile = getStoredGuestProfile();

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

    // check if guest already voted
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("*")
      .eq("poll_id", pollId)
      .eq("guest_profile_id", profile.id)
      .limit(1);

    if (votes && votes.length > 0) {
      setAlreadyVoted(true);
    }

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
    if (alreadyVoted) return;

    setSubmitting(true);

    const profile = getStoredGuestProfile();
    if (!profile) {
      router.push(`/guest/signup?redirect=/polls/${pollId}/vote`);
      return;
    }

    // 1. Insert vote record — unique constraint prevents duplicates
    const { error: voteError } = await supabase.from("poll_votes").insert({
      poll_id: pollId,
      option_id: optionId,
      guest_profile_id: profile.id,
    });

    if (voteError) {
      if (voteError.code === "23505") {
        setAlreadyVoted(true);
      }
      setSubmitting(false);
      return;
    }

    // 2. Increment vote count in poll_options
    const { error: countError } = await supabase.rpc("increment_vote_count", {
      option_uuid: optionId,
    });

    if (countError) {
      console.error("❌ Vote increment error:", countError);
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
        }}
      >
        {poll.question}
      </h1>

      {/* Already voted message */}
      {alreadyVoted && (
        <p style={{ color: "#ff4d4d", textAlign: "center", fontSize: "1.4rem" }}>
          You’ve already voted in this poll.
        </p>
      )}

      {/* Voting Options */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {options.map((opt: any) => (
          <button
            key={opt.id}
            disabled={!isActive || alreadyVoted}
            onClick={() => submitVote(opt.id)}
            style={{
              background: opt.bar_color,
              opacity: isActive && !alreadyVoted ? 1 : 0.35,
              padding: "18px",
              width: "100%",
              marginBottom: "1rem",
              borderRadius: 16,
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#fff",
              border: "none",
              cursor:
                isActive && !alreadyVoted ? "pointer" : "not-allowed",
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
