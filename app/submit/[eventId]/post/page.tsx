'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import { supabase } from '@/lib/supabaseClient';

export default function GuestSubmissionPage() {
  const { eventId } = useParams();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Handle Image Upload ---------- */
  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ---------- Handle Camera Input ---------- */
  const handleCameraInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileChange;
    input.click();
  };

  /* ---------- Crop Logic ---------- */
  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return null;

    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const { width, height, x, y } = croppedAreaPixels;
    const size = 500;

    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(
      image,
      x,
      y,
      width,
      height,
      0,
      0,
      size,
      size
    );

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        const croppedUrl = URL.createObjectURL(blob!);
        resolve(croppedUrl);
      }, 'image/jpeg');
    });
  };

  function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (err) => reject(err));
      img.src = url;
    });
  }

  /* ---------- Handle Submit ---------- */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!imageSrc) return alert('Please upload or take a photo first.');
    if (!message.trim()) return alert('Please enter a message.');

    setSubmitting(true);
    const cropped = await createCroppedImage();
    setCroppedImage(cropped);

    // Convert cropped image to blob
    const response = await fetch(cropped!);
    const blob = await response.blob();

    // Upload to Supabase storage
    const filename = `submission-${Date.now()}.jpg`;
    const { data: storageData, error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filename, blob, { contentType: 'image/jpeg' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('Error uploading image.');
      setSubmitting(false);
      return;
    }

    const photo_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submissions/${filename}`;

    // Insert into submissions table
    const { error: insertError } = await supabase.from('submissions').insert([
      {
        event_id: eventId,
        photo_url,
        message: message.trim(),
        nickname: nickname.trim() || null,
        status: 'pending',
      },
    ]);

    if (insertError) {
      console.error('Insert error:', insertError);
      alert('Error saving post.');
    } else {
      setImageSrc(null);
      setMessage('');
      setNickname('');
      alert('✅ Submitted to Wall (pending approval)');
    }

    setSubmitting(false);
  };

  /* ---------- UI ---------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
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
          padding: 30,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ marginBottom: 20, fontWeight: 700 }}>
          Add Your Photo to the Wall
        </h2>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={handleCameraInput}
            style={buttonStyle}
          >
            📸 Camera
          </button>
          <label style={{ ...buttonStyle, cursor: 'pointer' }}>
            📁 Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Crop Area */}
        {imageSrc && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 300,
              background: '#000',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            <Cropper
              image={imageSrc}
              crop={{ x: 0, y: 0 }}
              zoom={1}
              aspect={1}
              onCropChange={() => {}}
              onCropComplete={onCropComplete}
              onZoomChange={() => {}}
            />
          </div>
        )}

        {/* Message */}
        <textarea
          placeholder="Add a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={textAreaStyle}
        />

        {/* Nickname */}
        <input
          type="text"
          placeholder="Nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            ...buttonStyle,
            width: '100%',
            marginTop: 10,
            backgroundColor: submitting ? '#444' : '#1e90ff',
          }}
        >
          {submitting ? 'Submitting...' : 'Submit to Wall'}
        </button>
      </form>
    </div>
  );
}

/* ---------- Styles ---------- */
const buttonStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#1e90ff',
  border: 'none',
  padding: '12px 0',
  borderRadius: 10,
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.3s ease',
};

const textAreaStyle: React.CSSProperties = {
  width: '100%',
  height: 80,
  borderRadius: 10,
  border: '1px solid #777',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  padding: 10,
  fontSize: 14,
  marginBottom: 10,
  resize: 'none',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 10,
  border: '1px solid #777',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  padding: 10,
  fontSize: 14,
  marginBottom: 10,
  outline: 'none',
};
