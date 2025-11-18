"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { getSupabaseClient } from "@/lib/supabaseClient";

/* ✅ Get stored profile */
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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ✅ enforce signup */
  useEffect(() => {
    const p = getStoredGuestProfile();
    if (!p) router.replace(`/guest/signup?redirect=/wall/${wallUUID}/submit`);
    else setProfile(p);
  }, [router, wallUUID]);

  /* ✅ load wall data */
  useEffect(() => {
    async function loadWall() {
      const { data } = await supabase
        .from("fan_walls")
        .select(
          "id,title,background_type,background_value,host:host_id (branding_logo_url)"
        )
        .eq("id", wallUUID)
        .single();
      setWall(data);
    }
    loadWall();
  }, []);

  /* ✅ camera open */
  const openCamera = () => {
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "user");
      fileRef.current.click();
    }
  };

  /* ✅ file handler */
  const handleFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1080,
      useWebWorker: true,
    });
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(compressed);
  };

  /* ✅ upload helper */
  const uploadImage = async () => {
    if (!imageSrc) return null;
    const blob = await (await fetch(imageSrc)).blob();
    const file = new File([blob], "upload.jpg", { type: "image/jpeg" });
    const fileName = `${Date.now()}-guest.jpg`;

    const { error } = await supabase.storage
      .from("guest_uploads")
      .upload(fileName, file);

    if (error) return null;

    const { data } = supabase.storage
      .from("guest_uploads")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  /* ✅ submit */
  const submitPost = async (e: any) => {
    e.preventDefault();

    if (!imageSrc) {
      alert("Please take or upload a photo before submitting.");
      return;
    }

    if (!message.trim()) {
      alert("Please enter a message to post.");
      return;
    }

    setSubmitting(true);
    const photoUrl = await uploadImage();

    if (!photoUrl) {
      alert("Photo upload failed. Please try again.");
      setSubmitting(false);
      return;
    }

    await supabase.from("guest_posts").insert([
      {
        fan_wall_id: wallUUID,
        guest_profile_id: profile.id,
        nickname: profile.first_name,
        message,
        photo_url: photoUrl,
        status: "pending",
      },
    ]);

    setTimeout(() => {
      router.push(`/thanks/${wallUUID}`);
    }, 200);
  };

  if (!wall || !profile) return null;

  const bg = wall.background_value?.includes("http")
    ? `url(${wall.background_value})`
    : wall.background_value;

  const logo =
    wall.host?.branding_logo_url?.trim() !== ""
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
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      />

      <form
        onSubmit={submitPost}
        style={{
          position: "relative",
          maxWidth: 480,
          margin: "auto",
          padding: 25,
          textAlign: "center",
          borderRadius: 18,
          background: "rgba(0,0,0,0.55)",
          boxShadow: "0 0 30px rgba(0,0,0,0.7)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {/* ✅ Logo */}
        <img
          src={logo}
          style={{
            width: "70%",
            display: "block",
            margin: "0 auto 12px",
            animation: "pulse 2.2s infinite",
            filter: "drop-shadow(0 0 25px rgba(56,189,248,0.6))",
          }}
        />

        {/* ✅ Wall Title */}
        <h2 style={{ marginBottom: 16, fontWeight: 800 }}>{wall.title}</h2>

        {/* ✅ CROP BOX ALWAYS SHOWN */}
        <div
          style={{
            width: "100%",
            height: 260,
            position: "relative",
            marginBottom: 10,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, c) => setCroppedAreaPixels(c)}
            />
          ) : (
            <div
              style={{
                color: "#aaa",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              📸 No Photo Yet
            </div>
          )}
        </div>

        {/* ✅ Buttons under crop */}
        <button
          type="button"
          onClick={openCamera}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            background: "linear-gradient(90deg,#0284c7,#2563eb)",
            color: "#fff",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          📸 Take Photo
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          📁 Choose File
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFile}
        />

        {/* ✅ Retake */}
        {imageSrc && (
          <button
            type="button"
            onClick={() => setImageSrc(null)}
            style={{
              fontSize: 13,
              marginBottom: 10,
              textDecoration: "underline",
              opacity: 0.8,
            }}
          >
            ↻ Retake
          </button>
        )}

        {/* ✅ Name auto-filled */}
        <input
          value={profile.first_name}
          readOnly
          style={{
            width: "100%",
            padding: 12,
            textAlign: "center",
            marginBottom: 10,
            borderRadius: 10,
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            border: "1px solid #334155",
          }}
        />

        {/* ✅ Message */}
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
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            marginBottom: 5,
            border: "1px solid #334155",
          }}
        />

        <div style={{ textAlign: "right", fontSize: 12 }}>
          {message.length}/150
        </div>

        {/* ✅ Submit */}
        <button
          disabled={submitting}
          style={{
            width: "100%",
            padding: "12px 0",
            marginTop: 10,
            borderRadius: 10,
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(90deg,#0284c7,#2563eb)",
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
