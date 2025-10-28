'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';

export default function GuestPostPage() {
  const { eventId } = useParams();
  const eventUUID = Array.isArray(eventId) ? eventId[0] : eventId;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  /* ---------- Load First Name ---------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function loadName() {
      // Step 1: Try localStorage
      const stored = localStorage.getItem('guestProfile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const name = parsed.first_name || parsed.firstName;
          if (name) {
            setFirstName(name.trim());
            console.log('✅ Loaded name from localStorage:', name);
            return;
          }
        } catch (err) {
          console.error('Error parsing guestProfile from localStorage:', err);
        }
      }

      // Step 2: Fallback to Supabase
      const deviceId = stored ? JSON.parse(stored).device_id : null;
      if (!deviceId) {
        console.warn('⚠ No device_id found for fallback lookup');
        return;
      }

      const { data, error } = await supabase
        .from('guest_profiles')
        .select('first_name')
        .eq('device_id', deviceId)
        .single();

      if (error) {
        console.error('❌ Fallback lookup failed:', error);
        return;
      }

      if (data?.first_name) {
        setFirstName(data.first_name.trim());
        console.log('✅ Loaded name from Supabase fallback:', data.first_name);
      }
    }

    loadName();
  }, []);

  /* ---------- Image Logic ---------- */
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
    if (!imageSrc || !message.trim() || !firstName.trim()) {
      alert('Please add a photo, write a message, and ensure your name is set.');
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

    const { error: insertError } = await supabase.from('submissions').insert([
      {
        event_id: eventUUID,
        photo_url: publicUrl.publicUrl,
        message: message.trim(),
        first_name: firstName.trim(),
        status: 'pending',
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
        <h2 style={{ marginBottom: 14, fontWeight: 700 }}>
          Add Your Photo to the Wall
        </h2>

        {/* File Upload Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          <button type="button" onClick={handleCameraCapture} style={buttonStyle}>
            📷 Camera
          </button>
          <button type="button" onClick={() => document.getElementById('file-input')?.click()} style={buttonStyle}>
            📁 Upload
          </button>
          <input type="file" id="file-input" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>

        {/* Image Cropper */}
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

        {/* Auto-Filled First Name (Read-Only) */}
        <input
          type="text"
          name="first_name"
          id="first_name"
          value={firstName}
          readOnly
          style={{
            width: '90%',
            margin: '0 auto 12px',
            display: 'block',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #666',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 15,
            textAlign: 'center',
            opacity: 0.8,
          }}
          placeholder="First Name"
        />

        <textarea
          name="message"
          id="message"
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
          {submitting ? 'Submitting…' : 'Submit'}
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
