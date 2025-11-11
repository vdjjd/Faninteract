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

export default function PrizeWheelSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const wheelId = Array.isArray(params.wheelId)
    ? params.wheelId[0]
    : (params.wheelId as string);

  const supabase = getSupabaseClient();

  const [wheel, setWheel] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  /* ✅ Passphrase UI state */
  const [requirePasscode, setRequirePasscode] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ✅ enforce signup */
  useEffect(() => {
    const p = getStoredGuestProfile();
    if (!p) {
      router.replace(`/prizewheel/${wheelId}/signup`);
    } else {
      setProfile(p);
    }
  }, [router, wheelId]);

  /* ✅ load wheel background + branding */
  useEffect(() => {
    async function loadWheel() {
      const { data } = await supabase
        .from("prize_wheels")
        .select(
          "id,title,visibility,passphrase,background_type,background_value,host:host_id (branding_logo_url)"
        )
        .eq("id", wheelId)
        .single();

      setWheel(data);

      /* ✅ PASSPHRASE CHECK ADDED */
      if (data.visibility === "private" && data.passphrase) {
        setRequirePasscode(true);
      }
    }
    loadWheel();
  }, [wheelId]);

  /* ✅ Camera click */
  const openCamera = () => {
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "user");
      fileRef.current.click();
    }
  };

  /* ✅ Handle file upload */
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

  /* ✅ Upload to storage */
  const uploadImage = async () => {
    if (!imageSrc) return null;

    const blob = await (await fetch(imageSrc)).blob();
    const file = new File([blob], "upload.jpg", { type: "image/jpeg" });
    const fileName = `${profile.id}-${Date.now()}-wheel.jpg`;

    const { error } = await supabase.storage
      .from("guest_uploads")
      .upload(fileName, file);

    if (error) return null;

    const { data } = supabase.storage
      .from("guest_uploads")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  /* ✅ Submit */
  const submitEntry = async (e: any) => {
    e.preventDefault();

    /* ✅ PASSPHRASE VALIDATION BEFORE SUBMIT */
    if (requirePasscode) {
      if (!passInput.trim()) {
        setPassError("Please enter the passphrase.");
        return;
      }
      if (passInput.trim().toLowerCase() !== wheel.passphrase.toLowerCase()) {
        setPassError("Incorrect passphrase. Try again.");
        return;
      }

      // ✅ passphrase correct, unlock UI
      setRequirePasscode(false);
    }

    if (!imageSrc) {
      alert("You must upload a selfie to continue.");
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
      router.push(`/thanks/${wheelId}`);
    }, 300);
  };

  if (!wheel || !profile) return null;

  const bg =
    wheel.background_type === "image" &&
    wheel.background_value?.startsWith("http")
      ? `url(${wheel.background_value})`
      : wheel.background_value;

  const logo =
    wheel.host?.branding_logo_url?.trim()
      ? wheel.host.branding_logo_url
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

      {/* ✅ PASSPHRASE MODAL */}
      {requirePasscode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "rgba(0,0,0,0.8)",
              padding: 25,
              borderRadius: 14,
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 0 25px rgba(0,0,0,0.6)",
            }}
          >
            <h2 style={{ marginBottom: 12, fontWeight: 700 }}>Private Entry</h2>
            <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>
              This prize wheel requires a passphrase.
            </p>

            <input
              type="text"
              placeholder="Enter passphrase"
              value={passInput}
              onChange={(e) => {
                setPassInput(e.target.value);
                setPassError("");
              }}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                marginBottom: 10,
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid #334155",
                textAlign: "center",
              }}
            />

            {passError && (
              <p style={{ color: "#f87171", fontSize: 13, marginBottom: 10 }}>
                {passError}
              </p>
            )}

            <button
              onClick={() => {
                if (!passInput.trim()) {
                  setPassError("Please enter the passphrase.");
                  return;
                }

                if (
                  passInput.trim().toLowerCase() !==
                  wheel.passphrase.toLowerCase()
                ) {
                  setPassError("Incorrect passphrase. Try again.");
                  return;
                }

                setRequirePasscode(false);
              }}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                background: "linear-gradient(90deg,#0284c7,#2563eb)",
                color: "#fff",
                fontWeight: 700,
                marginTop: 5,
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

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

        {/* ✅ Wheel Title */}
        <h2 style={{ marginBottom: 16, fontWeight: 800 }}>
          {wheel.title || "Prize Wheel Entry"}
        </h2>

        {/* ✅ Crop Box */}
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

        {/* ✅ Required notice */}
        <p
          style={{
            color: "#fff",
            fontSize: 13,
            opacity: 0.7,
            marginBottom: 10,
          }}
        >
          You must upload a selfie to enter the Prize Wheel.
        </p>

        {/* ✅ Buttons */}
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

        {/* ✅ Name preview */}
        <input
          value={profile.first_name + " " + profile.last_name}
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
