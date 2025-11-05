"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { getSupabaseClient } from "@/lib/supabaseClient";

function getStoredGuestProfile(): any | null {
  try {
    const raw =
      localStorage.getItem("guest_profile") ||
      localStorage.getItem("guestInfo");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function GuestSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const wallUUID = Array.isArray(params.wallId)
    ? params.wallId[0]
    : (params.wallId as string);
  const supabase = getSupabaseClient();

  const [wall, setWall] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = getStoredGuestProfile();
    if (!p && wallUUID) {
      router.replace(`/guest/signup?redirect=/wall/${wallUUID}/submit`);
    } else setProfile(p);
  }, [router, wallUUID]);

  useEffect(() => {
    async function loadWall() {
      const { data } = await supabase
        .from("fan_walls")
        .select("id, title, background_type, background_value, host:host_id (branding_logo_url)")
        .eq("id", wallUUID)
        .single();
      setWall(data);
    }
    if (wallUUID) loadWall();
  }, [supabase, wallUUID]);

  const launchCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
      });
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error("Image compression failed", err);
    }
  };

  const uploadImage = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase
      .storage
      .from("guest_uploads")
      .upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage
      .from("guest_uploads")
      .getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!profile) return;

    if (!message && !imageSrc) {
      setError("Add a message or photo.");
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrl = null;
      if (imageSrc) {
        const blob = await (await fetch(imageSrc)).blob();
        const file = new File([blob], "upload.jpg", { type: "image/jpeg" });
        uploadedUrl = await uploadImage(file);
      }

      const { error } = await supabase.from("guest_posts").insert([
        {
          fan_wall_id: wallUUID,
          guest_profile_id: profile.id,
          nickname: profile.first_name || "Guest",
          message,
          photo_url: uploadedUrl,
          status: "pending",
        },
      ]);
      if (error) throw error;

      router.push(`/thanks/${wallUUID}`);
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!wall) return null;

  const bg = wall?.background_value?.includes("http")
    ? `url(${wall.background_value})`
    : wall?.background_value ||
      "linear-gradient(135deg,#0a2540,#1b2b44,#000000)";

  const displayLogo =
    wall?.host?.branding_logo_url?.trim() !== ""
      ? wall.host.branding_logo_url
      : "/faninteractlogo.png";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: bg,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        padding: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(5px)",
        }}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          maxWidth: 480,
          margin: "auto",
          padding: 25,
          borderRadius: 18,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          textAlign: "center",
          boxShadow: "0 0 30px rgba(0,0,0,0.6)",
        }}
      >
        {/* Logo */}
        <img
          src={displayLogo}
          style={{
            width: "70%",
            margin: "0 auto 15px",
            filter: "drop-shadow(0 0 25px rgba(56,189,248,0.6))",
            animation: "pulse 2.3s infinite",
          }}
        />

        <h2 style={{ marginBottom: 16, fontWeight: 800 }}>
          {wall.title}
        </h2>

        {/* First name input */}
        <input
          value={profile?.first_name || ""}
          readOnly
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 10,
            borderRadius: 10,
            border: "1px solid #334155",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
          }}
        />

        {/* Message */}
        <textarea
          maxLength={150}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message (optional)"
          style={{
            width: "100%",
            minHeight: 90,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #334155",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            resize: "none",
            marginBottom: 5,
          }}
        />
        <div style={{ textAlign: "right", fontSize: 12, opacity: 0.7 }}>
          {message.length}/150
        </div>

        {/* Image upload / camera */}
        {!imageSrc && (
          <button
            type="button"
            onClick={launchCamera}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              background:
                "linear-gradient(90deg,#0284c7,#2563eb)",
              color: "#fff",
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            📸 Take a photo
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          hidden
        />

        {imageSrc && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                width: "100%",
                height: 260,
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedAreaPixels(area)}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setImageSrc(null);
                setZoom(1);
              }}
              style={{
                marginTop: 8,
                fontSize: 14,
                opacity: 0.9,
                textDecoration: "underline",
              }}
            >
              ↻ Retake photo
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: "salmon", marginTop: 8 }}>{error}</p>
        )}

        <button
          disabled={submitting}
          style={{
            width: "100%",
            padding: "12px 0",
            marginTop: 14,
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
            background:
              "linear-gradient(90deg,#0284c7,#2563eb)",
            color: "#fff",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Submitting…" : "Send to Wall"}
        </button>
      </form>

      <style>{`
        @keyframes pulse {
          0% { filter: drop-shadow(0 0 12px rgba(56,189,248,0.6)); }
          50% { filter: drop-shadow(0 0 35px rgba(56,189,248,0.9)); }
          100% { filter: drop-shadow(0 0 12px rgba(56,189,248,0.6)); }
        }
      `}</style>
    </div>
  );
}
