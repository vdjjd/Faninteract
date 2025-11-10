"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { getSupabaseClient } from "@/lib/supabaseClient";

/* ✅ Load profile from localStorage */
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

export default function PrizeWheelSubmitPage() {
  const router = useRouter();
  const params = useParams();
  const wheelId = Array.isArray(params.wheelId)
    ? params.wheelId[0]
    : (params.wheelId as string);

  const supabase = getSupabaseClient();

  const [profile, setProfile] = useState<any>(null);
  const [wheel, setWheel] = useState<any>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ✅ Require signup */
  useEffect(() => {
    const p = getStoredGuestProfile();
    if (!p) {
      router.replace(`/guest/signup?redirect=/prizewheel/${wheelId}/submit`);
    } else {
      setProfile(p);
    }
  }, [router, wheelId]);

  /* ✅ Load wheel background */
  useEffect(() => {
    async function loadWheel() {
      const { data } = await supabase
        .from("prize_wheels")
        .select("title, background_value")
        .eq("id", wheelId)
        .single();

      setWheel(data);
    }
    loadWheel();
  }, [wheelId, supabase]);

  /* ✅ Open camera */
  const openCamera = () => {
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "user");
      fileRef.current.click();
    }
  };

  /* ✅ Handle file upload (with compression) */
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

  /* ✅ Upload to guest_uploads */
  const uploadImage = async () => {
    if (!imageSrc) return null;

    const blob = await (await fetch(imageSrc)).blob();
    const file = new File([blob], "upload.jpg", { type: "image/jpeg" });
    const filename = `${profile.id}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("guest_uploads")
      .upload(filename, file);

    if (error) return null;

    const { data } = supabase.storage
      .from("guest_uploads")
      .getPublicUrl(filename);

    return data.publicUrl;
  };

  /* ✅ Submit entry */
  const submitEntry = async (e: any) => {
    e.preventDefault();

    if (!imageSrc) {
      alert("You must upload a selfie to enter.");
      return;
    }

    setSubmitting(true);
    const photoUrl = await uploadImage();

    await supabase.from("wheel_entries").insert([
      {
        wheel_id: wheelId,
        guest_profile_id: profile.id,
        photo_url: photoUrl,
        status: "pending",
      },
    ]);

    setTimeout(() => {
      router.push(`/prizewheel/${wheelId}/thanks`);
    }, 300);
  };

  if (!profile || !wheel) return null;

  const bg =
    wheel.background_value?.includes("http")
      ? `url(${wheel.background_value})`
      : wheel.background_value;

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
        onSubmit={submitEntry}
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
        <h2
          style={{
            marginBottom: 12,
            fontWeight: 800,
            fontSize: 26,
            color: "#fff",
          }}
        >
          {wheel.title}
        </h2>

        {/* ✅ Crop box */}
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

        <div
          style={{
            fontSize: 14,
            color: "#f8f8f8",
            marginBottom: 12,
            opacity: 0.9,
          }}
        >
          <strong>You must upload a selfie to enter.</strong>
        </div>

        {/* ✅ Camera + File Buttons */}
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

        {/* ✅ Name (readonly) */}
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
          {submitting ? "Submitting…" : "Enter Prize Wheel"}
        </button>
      </form>
    </div>
  );
}
