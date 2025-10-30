'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';
import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 🧠 DEVICE ID RETRIEVAL                                                    */
/* -------------------------------------------------------------------------- */
function getDeviceInfo() {
  try {
    const profile = localStorage.getItem('guestInfo');
    if (!profile) return null;
    return JSON.parse(profile);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 📸 SUBMISSION PAGE                                                        */
/* -------------------------------------------------------------------------- */
export default function GuestSubmissionPage() {
  const router = useRouter();
  const { wallId } = useParams();
  const wallUUID = Array.isArray(wallId) ? wallId[0] : wallId;

  const [event, setEvent] = useState<any>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ---------------------------------------------------------------------- */
  /* 🔹 Load Fan Wall Info                                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    async function loadWall() {
      const { data, error } = await supabase
        .from('fan_walls')
        .select('id, title, background_value')
        .eq('id', wallUUID)
        .single();
      if (error) console.error(error);
      else setEvent(data);
    }
    if (wallUUID) loadWall();
  }, [wallUUID]);

  /* ---------------------------------------------------------------------- */
  /* 🔹 Handle Image Upload                                                 */
  /* ---------------------------------------------------------------------- */
  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
      };
      const compressed = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('❌ Image compression failed', err);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 🔹 Upload to Supabase Storage                                          */
  /* ---------------------------------------------------------------------- */
  const uploadImage = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('guest_uploads')
      .upload(fileName, file);
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('guest_uploads')
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  /* ---------------------------------------------------------------------- */
  /* 🔹 Handle Submit                                                       */
  /* ---------------------------------------------------------------------- */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    const guest = getDeviceInfo();
    if (!guest) {
      router.push(`/guest/signup?redirect=/submit/${wallUUID}`);
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
        const blob = await (await fetch(imageSrc)).blob();
        const file = new File([blob], 'upload.jpg', { type: 'image/jpeg' });
        uploadedUrl = await uploadImage(file);
      }

      const { data, error } = await supabase
        .from('guest_posts')
        .insert([
          {
            fan_wall_id: wallUUID,
            guest_profile_id: guest.guest_profile_id,
            nickname: nickname || `${guest.firstName} ${guest.lastName}`,
            message,
            photo_url: uploadedUrl,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Submission created:', data);

      // ✅ Redirect to new universal thank-you page
      router.push(`/thanks/${wallUUID}?type=wall`);
    } catch (err: any) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 🔹 RENDER                                                              */
  /* ---------------------------------------------------------------------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          event?.background_value ||
          'linear-gradient(180deg,#001f3f,#000)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        fontFamily: 'system-ui,sans-serif',
        color: '#fff',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(0,0,0,0.65)',
          borderRadius: 16,
          padding: 30,
          textAlign: 'center',
          boxShadow: '0 0 25px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ marginBottom: 16, fontWeight: 700 }}>
          {event?.title || 'Submit to Fan Zone'}
        </h2>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message (optional)"
          style={{
            width: '90%',
            minHeight: 80,
            padding: 12,
            borderRadius: 10,
            border: '1px solid #555',
            background: 'rgba(0,0,0,0.3)',
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
            width: '90%',
            padding: 10,
            borderRadius: 10,
            border: '1px solid #555',
            background: 'rgba(0,0,0,0.3)',
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
              width: '90%',
              height: 250,
              margin: '10px auto',
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
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

        {error && <p style={{ color: 'salmon' }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '90%',
            backgroundColor: submitting ? '#555' : '#1e90ff',
            border: 'none',
            padding: '12px 0',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            marginTop: 10,
          }}
        >
          {submitting ? 'Submitting...' : 'Submit to Wall'}
        </button>
      </form>
    </div>
  );
}
