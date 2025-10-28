'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';

export default function GuestPostPage() {
  const { eventId } = useParams();
  const eventUUID = Array.isArray(eventId) ? eventId[0] : eventId;

  const [event, setEvent] = useState<any>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  /* ---------- Load event data ---------- */
  useEffect(() => {
    if (!eventUUID) {
      setLoadingEvent(false);
      return;
    }

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('title, background_value, logo_url')
        .eq('id', eventUUID)
        .single();

      if (error) {
        console.error('❌ Error loading event:', error);
      } else {
        setEvent(data);
      }
      setLoadingEvent(false);
    };

    fetchEvent();
  }, [eventUUID]);

  /* ---------- Load guest name from localStorage ---------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('guestProfile');
    console.log('🧪 [SubmitPage] guestProfile from localStorage:', stored);

    if (!stored) {
      console.warn('⚠ No guestProfile found in localStorage');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      console.log('🔍 stored keys:', Object.keys(parsed));
      console.log('🔍 parsed.firstName:', parsed.firstName);
      console.log('🔍 parsed.first_name:', parsed.first_name);

      const name =
        parsed.firstName ||
        parsed.first_name ||
        '';
      if (name) {
        setFirstName(name.trim());
        console.log('✅ Auto-filled name:', name.trim());
      } else {
        console.warn('⚠ guestProfile found but missing name field:', parsed);
      }
    } catch (err) {
      console.error('❌ Error parsing guestProfile from localStorage:', err);
    }
  }, []);

  if (loadingEvent) {
    return (
      <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading event …</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Event not found.</p>
      </div>
    );
  }

  /* ---------- File Handling ---------- */
  async function handleFileSelect(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1080, useWebWorker: true };
    const compressed = await imageCompression(file, options);
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(compressed);
  }

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileSelect;
    input.click();
  };

  const onCropComplete = useCallback((_: any, area: any) => {
    setCroppedAreaPixels(area);
  }, []);

  async function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  }

  async function getCroppedImage() {
    if (!imageSrc || !croppedAreaPixels) return null;
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );
    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(URL.createObjectURL(blob));
      }, 'image/jpeg');
    });
  }

  /* ---------- Submit ---------- */
  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!imageSrc || !message.trim()) {
      alert('Please add a photo and message.');
      return;
    }

    setSubmitting(true);
    setFadeOut(true);

    const croppedImg = await getCroppedImage();
    if (!croppedImg) {
      alert('Error processing image.');
      setSubmitting(false);
      setFadeOut(false);
      return;
    }

    const fileName = `submission_${Date.now()}.jpg`;
    const response = await fetch(croppedImg);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, blob, { contentType: 'image/jpeg' });

    if (uploadError) {
      alert('Upload failed.');
      setSubmitting(false);
      setFadeOut(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    const stored = localStorage.getItem('guestProfile');
    let guest_profile_id = null;
    let guest_id = null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        guest_profile_id = parsed.id || null;
        guest_id = parsed.guest_id || null;
      } catch (err) {
        console.error('Error parsing guestProfile in submit page:', err);
      }
    }

    const { error: insertError } = await supabase.from('submissions').insert([
      {
        event_id: eventUUID,
        photo_url: publicUrl.publicUrl,
        message: message.trim(),
        nickname: firstName || 'Guest',
        status: 'pending',
        guest_profile_id,
        guest_id,
      },
    ]);

    if (insertError) {
      alert('Error submitting post.');
      setSubmitting(false);
      setFadeOut(false);
      return;
    }

    setTimeout(() => {
      window.location.href = `/thanks/${eventUUID}`;
    }, 800);
  }

  return (
    <div
      style={{
        background: '#000',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(180deg,#0d1b2a,#1b263b)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {event.logo_url && (
          <img
            src={event.logo_url}
            alt="Event Logo"
            style={{
              width: 140,
              height: 140,
              objectFit: 'contain',
              marginBottom: 6,
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))',
            }}
          />
        )}

        <h2 style={{ marginBottom: 14, fontWeight: 700 }}>
          Add Your Photo to {event.title}
        </h2>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <button type="button" onClick={handleCameraCapture} style={buttonStyle}>
            📷 Camera
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('file-input')?.click()}
            style={buttonStyle}>
            📁 Upload
          </button>
          <input
            type="file"
            id="file-input"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            width: 280,
            height: 280,
            background: '#111',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              onCropChange={setCrop}
              cropShape="rect"
              aspect={1}
              zoom={zoom}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition={false}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: 14,
              }}
            >
              Take a photo or upload one to begin
            </div>
          )}
        </div>

        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={{
            width: '90%',
            margin: '0 auto 12px',
            display: 'block',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #666',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 15,
            textAlign: 'center',
            opacity: 0.7,
          }}
          placeholder="First Name"
        />

        <textarea
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: '90%',
            margin: '0 auto 10px',
            display: 'block',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #666',
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
            fontSize: 15,
            textAlign: 'center',
            resize: 'none',
            minHeight: 70,
          }}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            ...buttonStyle,
            width: '90%',
            padding: '12px 0',
            fontSize: 16,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting …' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#1e90ff',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontWeight: 600,
  padding: '10px 18px',
  cursor: 'pointer',
  fontSize: 14,
  transition: 'background 0.3s ease',
};
