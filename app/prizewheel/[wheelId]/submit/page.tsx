// ✅ PrizeWheelSubmissionPage.tsx (FULLY PATCHED)
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { getSupabaseClient } from "@/lib/supabaseClient";

/* --------------------------------------------- */
/* Load stored guest profile                     */
/* --------------------------------------------- */
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

  /* Passcode UI */
  const [requirePasscode, setRequirePasscode] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");

  /* Remote spin */
  const [selectedForSpin, setSelectedForSpin] = useState(false);

  /* Image state */
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  /* Submission state */
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  /* --------------------------------------------- */
  /* Require signup                                 */
  /* --------------------------------------------- */
  useEffect(() => {
    const p = getStoredGuestProfile();
    if (!p) {
      router.replace(`/prizewheel/${wheelId}/signup`);
    } else {
      setProfile(p);
    }
  }, [router, wheelId]);

  /* --------------------------------------------- */
  /* Load wheel details                             */
  /* --------------------------------------------- */
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

      if (data.visibility === "private" && data.passphrase) {
        setRequirePasscode(true);
      }
    }
    loadWheel();
  }, [wheelId]);

  /* --------------------------------------------- */
  /* Realtime: Remote spin selection                */
  /* --------------------------------------------- */
  useEffect(() => {
    if (!profile?.id || !wheelId) return;

    const channel = supabase
      .channel(`prizewheel-${wheelId}`)
      .on(
        "broadcast",
        { event: "guest_chosen_for_remote_spin" },
        (payload) => {
          if (payload?.payload?.guestId === profile.id) {
            setSelectedForSpin(true);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id, wheelId]);

  /* Trigger remote spin */
  const triggerRemoteSpin = async () => {
    if (!profile?.id) return;

    await supabase.channel(`prizewheel-${wheelId}`).send({
      type: "broadcast",
      event: "remote_spin",
      payload: { guestId: profile.id },
    });

    setSelectedForSpin(false);
  };

  /* Camera click */
  const openCamera = () => {
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "user");
      fileRef.current.click();
    }
  };

  /* --------------------------------------------- */
  /* Handle file upload                             */
  /* --------------------------------------------- */
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

  /* --------------------------------------------- */
  /* Upload Image                                    */
  /* --------------------------------------------- */
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

  /* --------------------------------------------- */
  /* SUBMIT — with NEW VALIDATION                   */
  /* --------------------------------------------- */
  const submitEntry = async (e: any) => {
    e.preventDefault();
    setErrorMsg("");

    /* Validate passphrase */
    if (requirePasscode) {
      if (!passInput.trim()) {
        setPassError("Please enter the passphrase.");
        return;
      }
      if (passInput.trim().toLowerCase() !== wheel.passphrase.toLowerCase()) {
        setPassError("Incorrect passphrase. Try again.");
        return;
      }
      setRequirePasscode(false);
    }

    /* PHOTO REQUIRED */
    if (!imageSrc) {
      setErrorMsg("You must upload a selfie to continue.");
      return;
    }

    /* EMAIL OR PHONE REQUIRED */
    const hasEmail = profile?.email?.trim();
    const hasPhone = profile?.phone?.trim();

    if (!hasEmail && !hasPhone) {
      setErrorMsg("You must provide either an email or a phone number.");
      return;
    }

    setSubmitting(true);

    const photoUrl = await uploadImage();

    await supabase.from("wheel_entries").insert([
      {
        wheel_id: wheelId,
        guest_profile_id: profile.id,
        photo_url: photoUrl,
        first_name: profile.first_name,
        last_name: profile.last_name,
        status: "pending",
      },
    ]);

    setTimeout(() => {
      router.push(`/thanks/${wheelId}`);
    }, 300);
  };

  /* --------------------------------------------- */
  /* Render                                         */
  /* --------------------------------------------- */
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

      {/* Remote Spin Notice */}
      <div
        style={{
          position: "relative",
          zIndex: 50,
          maxWidth: 480,
          margin: "0 auto 20px",
          padding: "12px 16px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff",
          textAlign: "center",
          fontSize: 15,
        }}
      >
        <strong>Stay right here…</strong>
        <br />
        You may be chosen to <strong>SPIN THE WHEEL</strong> from your phone!
      </div>

      {/* Remote Spin Button */}
      {selectedForSpin && (
        <button
          onClick={triggerRemoteSpin}
          style={{
            position: "relative",
            zIndex: 60,
            maxWidth: 480,
            width: "100%",
            margin: "0 auto 20px",
            padding: "16px 0",
            borderRadius: 14,
            background: "linear-gradient(90deg,#22c55e,#16a34a)",
            fontWeight: 800,
            color: "#fff",
            fontSize: 20,
            animation: "glowRemote 1.5s infinite",
          }}
        >
          🎰 Spin From Your Phone
        </button>
      )}

      {/* MAIN FORM */}
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
        <img
          src={logo}
          style={{
            width: "70%",
            margin: "0 auto 12px",
            display: "block",
            filter: "drop-shadow(0 0 25px rgba(56,189,248,0.6))",
          }}
        />

        <h2 style={{ marginBottom: 16 }}>{wheel.title || "Prize Wheel Entry"}</h2>

        {/* Image Crop Box */}
        <div
          style={{
            width: "100%",
            height: 260,
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 10,
            background: "rgba(0,0,0,0.3)",
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
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#aaa",
              }}
            >
              📸 No Photo Yet
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            style={{
              color: "#ffb3b3",
              fontSize: 14,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={openCamera}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            background: "linear-gradient(90deg,#0284c7,#2563eb)",
            color: "#fff",
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
            marginBottom: 10,
          }}
        >
          📁 Choose File
        </button>

        <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleFile} />

        {/* Show saved name */}
        <input
          value={profile.first_name + " " + profile.last_name}
          readOnly
          style={{
            width: "100%",
            padding: 12,
            background: "rgba(0,0,0,0.4)",
            borderRadius: 10,
            marginTop: 10,
            color: "#fff",
            textAlign: "center",
            border: "1px solid #334155",
          }}
        />

        <button
          disabled={submitting}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            marginTop: 20,
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
        @keyframes glowRemote {
          0% { box-shadow: 0 0 20px rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 40px rgba(34,197,94,1); }
          100% { box-shadow: 0 0 20px rgba(34,197,94,0.5); }
        }
      `}</style>
    </div>
  );
}
