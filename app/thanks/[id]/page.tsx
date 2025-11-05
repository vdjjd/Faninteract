"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function ThankYouPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();

  const [data, setData] = useState<any>(null);
  const [showCloseHint, setShowCloseHint] = useState(false);

  const type = searchParams.get("type") || "fan_wall";

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      const table =
        type === "poll"
          ? "polls"
          : type === "wheel"
          ? "prize_wheels"
          : "fan_walls";

      const { data, error } = await supabase
        .from(table)
        .select(
          `title,
           background_value,
           host:host_id (
             branding_logo_url
           )`
        )
        .eq("id", id)
        .maybeSingle();

      if (error) console.error("❌ ThankYou fetch error:", error);
      setData(data);
    }

    fetchData();
  }, [id, type, supabase]);

  const getMessage = () => {
    switch (type) {
      case "poll":
        return "Your vote has been recorded!";
      case "wheel":
        return "Good luck!";
      case "trivia":
        return "Your answer has been submitted!";
      default:
        return "Your post has been sent for approval!";
    }
  };

  const bg =
    data?.background_value ||
    "linear-gradient(135deg,#0a2540,#1b2b44,#000000)";

  const displayLogo =
    data?.host?.branding_logo_url && data.host.branding_logo_url.trim() !== ""
      ? data.host.branding_logo_url
      : "/faninteractlogo.png";

  const handleClose = () => {
    const closed = window.close();
    if (!closed) {
      // Browser blocked it — show hint
      setShowCloseHint(true);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: bg.includes("http") ? `url(${bg})` : bg,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 25,
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 450,
          width: "100%",
          padding: "40px 25px",
          borderRadius: 20,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 35px rgba(0,0,0,0.6)",
        }}
      >
        <img
          src={displayLogo}
          style={{
            width: "75%",
            maxWidth: 260,
            margin: "0 auto 20px",
            filter: "drop-shadow(0 0 25px rgba(56,189,248,0.85))",
            animation: "pulseGlow 2.5s ease-in-out infinite",
          }}
        />

        <h1 style={{ fontSize: "2.1rem", marginBottom: 10, fontWeight: 800 }}>
          🎉 Thank You!
        </h1>

        <p style={{ color: "#cbd5e1", marginBottom: 25 }}>{getMessage()}</p>

        {!showCloseHint ? (
          <button
            onClick={handleClose}
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              background: "linear-gradient(90deg,#0284c7,#2563eb)",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              width: "100%",
            }}
          >
            Close
          </button>
        ) : (
          <p style={{ color: "#fff", fontSize: 16 }}>
            ✅ You can now close this tab
          </p>
        )}
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(56,189,248,0.65)); }
          50% { filter: drop-shadow(0 0 35px rgba(56,189,248,0.95)); }
        }
      `}</style>
    </div>
  );
}