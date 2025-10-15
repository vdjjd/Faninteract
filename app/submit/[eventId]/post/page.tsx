'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

export default function GuestPostPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ---------- Handle Image Input ---------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, { maxWidthOrHeight: 1080, maxSizeMB: 1 });
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('Compression error:', err);
      setError('Image failed to load.');
    }
  };

  const handleTakePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileUpload as any;
    input.click();
  };

  /* ---------- Crop Logic ---------- */
  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return null;
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
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
        if (!blob) return;
        const fileUrl = URL.createObjectURL(blob);
        resolve(fileUrl);
      }, 'image/jpeg');
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (err) => reject(err));
      img.src = url;
    });

  /* ---------- Handle Submit ---------- */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!imageSrc) return setError('Please add a photo first.');
    setSubmitting(true);
    setError('');

    const croppedImage = await getCroppedImage();

    // Upload cropped image to Supabase Storage
    const blob = await fetch(croppedImage!).then((res) => res.blob());
    const fileName = `photo_${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, blob);

    if (uploadError) {
      console.error(uploadError);
      setError('Image upload failed.');
      setSubmitting(false);
      return;
    }

    const publicUrl = supabase.storage.from('uploads').getPublicUrl(uploadData.path).data.publicUrl;

    const { error: insertError } = await supabase.from('submissions').insert([
      {
        event_id: eventId,
        photo_url: publicUrl,
        message,
        nickname,
        status: 'pending',
      },
    ]);

    if (insertError) {
      console.error(insertError);
      setError('Error submitting post.');
      setSubmitting(false);
      return;
    }

    router.push(`/thankyou`);
  };

  /* ---------- Render ---------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(180deg,#0d1b2a,#1b263b)',
          borderRadius: 16,
          padding: 30,
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img
          src="/faninteractlogo.png"
          alt="Logo"
          style={{
            width: 180,
            height: 180,
            objectFit: 'contain',
            marginBottom: -6,
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))',
          }}
        />
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
            marginTop: 0,
            marginBottom: 10,
            fontWeight: 700,
            textShadow: '0 0 12px rgba(0,0,0,0.6)',
          }}
        >
          Add Your Photo to the Wall
        </h2>

        {/* Buttons row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          <button
            type="button"
            onClick={handleTakePhoto}
            style={{
              backgroundColor: '#1e90ff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📷 Take Photo
          </button>

          <label
            style={{
              backgroundColor: '#1e90ff',
              padding: '10px 16px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📁 Upload
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Crop area */}
        <div
          style={{
            position: 'relative',
            width: 320,
            height: 320,
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
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              restrictPosition={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#777',
                fontSize: 16,
              }}
            >
              Take or Upload a Photo
            </div>
          )}
        </div>

        {/* Message & nickname */}
        <textarea
          placeholder="Your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: '85%',
            padding: 12,
            borderRadius: 10,
            border: '1px solid #777',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            fontSize: 16,
            marginBottom: 12,
            textAlign: 'center',
          }}
        />
        <input
          type="text"
          placeholder="Nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{
            width: '85%',
            padding: 12,
            borderRadius: 10,
            border: '1px solid #777',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 12,
          }}
        />

        {error && <p style={{ color: 'salmon', marginBottom: 8 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '85%',
            backgroundColor: submitting ? '#444' : '#1e90ff',
            border: 'none',
            padding: '12px 0',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 600,
            marginTop: 10,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s ease',
          }}
        >
          {submitting ? 'Submitting...' : 'Submit to Wall'}
        </button>
      </form>
    </div>
  );
}
