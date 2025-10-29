'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';

export default function GuestPostPage() {
  const { eventId } = useParams();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  /* ---------- Load guest name from localStorage ---------- */
  useEffect(() => {
    const guestData = localStorage.getItem('guestInfo');
    if (guestData) {
      try {
        const parsed = JSON.parse(guestData);
        if (parsed.firstName) setFirstName(parsed.firstName);
      } catch (err) {
        console.error('Error loading guest info:', err);
      }
    }
  }, []);

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

  /* ---------- Crop Logic ---------- */
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
    if (!imageSrc || !message.trim())
      return alert('Please add a photo and message.');

    setSubmitting(true);

    // 🔹 Start fade-out animation
    setFadeOut(true);

    const croppedImg = await getCroppedImage();
    if (!croppedImg) return alert('Error processing image.');

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

    const { error: insertError } = await supabase.from('submissions').insert([
      {
        event_id: eventId,
        photo_url: publicUrl.publicUrl,
        message: message.trim(),
        nickname: firstName || 'Guest',
        status: 'pending',
      },
    ]);

    if (insertError) {
      alert('Error submitting post.');
      setSubmitting(false);
      setFadeOut(false);
      return;
    }

    // Wait for fade to finish before redirect
    setTimeout(() => {
      window.location.href = `/thanks/${eventId}`;
    }, 800);
  }

  /* ---------- UI ---------- */
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
        <img
          src="/faninteractlogo.png"
          alt="FanInteract"
          style={{
            width: 140,
            height: 140,
            objectFit: 'contain',
            marginBottom: 6,
            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))',
          }}
        />

        <h2 style={{ marginBottom: 14, fontWeight: 700 }}>
          Add Your Photo to the Wall
        </h2>

        {/* Buttons Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={handleCameraCapture}
            style={buttonStyle}
          >
            📷 Camera
          </button>
          <button
            type="button"
            onClick={() =>
              document.getElementById('file-input')?.click()
            }
            style={buttonStyle}
          >
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

        {/* Crop Box */}
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

        {/* First Name (auto-filled + locked) */}
        <input
          type="text"
          value={firstName}
          readOnly
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
        />

        {/* Message */}
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
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

/* ---------- Styles ---------- */
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
