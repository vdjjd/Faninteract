'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';

export default function GuestPostPage() {
  const router = useRouter();
  const { eventId } = useParams();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Handle Image Selection ---------- */
  async function handleFileSelect(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1080,
      useWebWorker: true,
    };

    const compressed = await imageCompression(file, options);
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(compressed);
  }

  const handleCameraCapture = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileSelect;
    input.click();
  };

  /* ---------- Crop Logic ---------- */
  const onCropComplete = useCallback(
    (_: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

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
        if (blob) {
          const fileUrl = URL.createObjectURL(blob);
          resolve(fileUrl);
        }
      }, 'image/jpeg');
    });
  }

  function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  }

  /* ---------- Submit ---------- */
  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!imageSrc || !message.trim()) {
      alert('Please add a photo and a message before submitting.');
      return;
    }

    setSubmitting(true);

    const croppedImg = await getCroppedImage();
    if (!croppedImg) {
      setSubmitting(false);
      alert('Error processing image.');
      return;
    }

    // Upload to Supabase Storage
    const fileName = `submission_${Date.now()}.jpg`;
    const response = await fetch(croppedImg);
    const blob = await response.blob();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, blob, { contentType: 'image/jpeg' });

    if (uploadError) {
      console.error(uploadError);
      alert('Upload failed.');
      setSubmitting(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    // Insert into DB
    const { error: insertError } = await supabase.from('submissions').insert([
      {
        event_id: eventId,
        photo_url: publicUrl.publicUrl,
        message: message.trim(),
        nickname: nickname.trim() || null,
        status: 'pending',
      },
    ]);

    if (insertError) {
      console.error(insertError);
      alert('Error submitting post.');
      setSubmitting(false);
      return;
    }

    alert('✅ Your photo has been submitted for approval!');
    setTimeout(() => {
      window.close();
    }, 2000);
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
        }}
      >
        {/* Logo */}
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

        <h2 style={{ marginBottom: 14, fontWeight: 700 }}>Add Your Photo to the Wall</h2>

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
          <button type="button" onClick={() => document.getElementById('file-input')?.click()} style={buttonStyle}>
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

        {/* Crop Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 260,
            background: '#111',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              cropShape="rect"
              aspect={1}
              cropSize={{ width: 260, height: 260 }}
              zoom={zoom}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
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

        {/* Message */}
        <textarea
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #666',
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
            marginBottom: 10,
            fontSize: 15,
            textAlign: 'center',
            resize: 'none',
            minHeight: 70,
          }}
        />

        {/* Nickname */}
        <input
          type="text"
          placeholder="Nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #666',
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
            marginBottom: 16,
            fontSize: 15,
            textAlign: 'center',
          }}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            ...buttonStyle,
            width: '100%',
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
