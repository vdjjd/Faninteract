'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { getSupabaseClient } from '@/lib/supabaseClient';

/* ------------------------- Helpers ------------------------- */
function getStoredGuestProfile(): any | null {
  try {
    // We’ve standardized on this key in recent steps
    const raw = localStorage.getItem('guest_profile') || localStorage.getItem('guestInfo');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ---------------------- Submit Page ------------------------ */
export default function GuestSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const wallUUID = Array.isArray(params.wallId) ? params.wallId[0] : (params.wallId as string);
  const supabase = getSupabaseClient();

  const [wall, setWall] = useState<any>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ---------- Load Fan Wall ---------- */
  useEffect(() => {
    async function loadWall() {
      const { data, error } = await supabase
        .from('fan_walls')
        .select('id, title, background_type, background_value')
        .eq('id', wallUUID)
        .single();
      if (error) {
        console.error(error);
      } else {
        setWall(data);
      }
    }
    if (wallUUID) loadWall();
  }, [supabase, wallUUID]);

  /* ---------- Enforce guest signup ---------- */
  useEffect(() => {
    const profile = getStoredGuestProfile();
    if (!profile && wallUUID) {
      router.replace(`/guest/signup?redirect=/wall/${wallUUID}/submit`);
    }
  }, [router, wallUUID]);

  /* ---------- File select / compress ---------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      console.error('❌ Image compression failed', err);
    }
  };

  /* ---------- Upload to Supabase Storage ---------- */
  const uploadImage = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('guest_uploads').upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('guest_uploads').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const guest = getStoredGuestProfile();
    if (!guest) {
      router.replace(`/guest/signup?redirect=/wall/${wallUUID}/submit`);
      return;
    }

    if (!message && !imageSrc) {
      setError('Please include a message or upload a photo.');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrl: string | null = null;

      if (imageSrc) {
        // You can add cropping export later. For now we send the compressed image as picked.
        const blob = await (await fetch(imageSrc)).blob();
        const file = new File([blob], 'upload.jpg', { type: 'image/jpeg' });
        uploadedUrl = await uploadImage(file);
      }

      const displayName =
        nickname?.trim() ||
        [guest?.first_name || guest?.firstName, guest?.last_name || guest?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        'Guest';

      const { error } = await supabase.from('guest_posts').insert([
        {
          fan_wall_id: wallUUID,
          guest_profile_id: guest?.id || guest?.guest_profile_id || null,
          nickname: displayName,
          message,
          photo_url: uploadedUrl,
          status: 'pending',
        },
      ]);
      if (error) throw error;

      router.push(`/thanks/${wallUUID}?type=wall`);
    } catch (err: any) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Background style (NO SHORTHAND) ---------- */
  const isImage = wall?.background_type === 'image';
  const bgValue =
    wall?.background_value ||
    'linear-gradient(135deg,#0a2540,#1b2b44,#000000)';

  // Important: never mix `background` with non-shorthand properties
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundImage: isImage ? `url(${bgValue})` : bgValue,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    color: '#fff',
    position: 'relative',
  };

  return (
    <div style={containerStyle}>
      {/* dim overlay for readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'rgba(0,0,0,0.65)',
          borderRadius: 16,
          padding: 30,
          textAlign: 'center',
          boxShadow: '0 0 25px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h2 style={{ marginBottom: 16, fontWeight: 800, letterSpacing: 0.3 }}>
          {wall?.title || 'Submit to Fan Zone'}
        </h2>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message (optional)"
          style={{
            width: '100%',
            minHeight: 90,
            padding: 12,
            borderRadius: 10,
            border: '1px solid #334155',
            backgroundColor: 'rgba(0,0,0,0.35)',
            color: '#fff',
            resize: 'none',
            marginBottom: 12,
          }}
        />

        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Display name (optional)"
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 10,
            border: '1px solid #334155',
            backgroundColor: 'rgba(0,0,0,0.35)',
            color: '#fff',
            marginBottom: 12,
          }}
        />

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ marginBottom: 10 }}
        />

        {imageSrc && (
          <div
            style={{
              width: '100%',
              height: 260,
              margin: '10px auto',
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
        )}

        {error && (
          <p style={{ color: 'salmon', marginTop: 8, marginBottom: 6 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            background:
              'linear-gradient(90deg, rgba(2,132,199,1) 0%, rgba(37,99,235,1) 100%)',
            border: 'none',
            padding: '12px 0',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            marginTop: 12,
            boxShadow: '0 8px 25px rgba(56,189,248,0.25)',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Submitting…' : 'Submit to Wall'}
        </button>
      </form>
    </div>
  );
}
