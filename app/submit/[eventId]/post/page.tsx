'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';

export default function SubmitPostPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  /* ---------- Load Event ---------- */
  useEffect(() => {
    async function loadEvent() {
      const { data } = await supabase
        .from('events')
        .select('title, background_value, logo_url')
        .eq('id', eventId)
        .single();
      if (data) setEvent(data);
    }
    loadEvent();

    const savedName = localStorage.getItem('nickname');
    if (savedName) setNickname(savedName);
  }, [eventId]);

  /* ---------- Crop Logic ---------- */
  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  /* ---------- Handle File Input ---------- */
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const options = { maxSizeMB: 1, maxWidthOrHeight: 1080, useWebWorker: true };
    const compressed = await imageCompression(file, options);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(compressed);
  }

  /* ---------- Handle Camera Capture ---------- */
  async function handleCameraClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = handleFileSelect as any;
    input.click();
  }

  /* ---------- Upload Submission ---------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!photo || !message.trim()) {
      setError('Please add a photo and a message.');
      return;
    }

    setSubmitting(true);
    try {
      const blob = await (await fetch(photo)).blob();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const filePath = `submissions/${eventId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, blob, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('submissions').getPublicUrl(filePath).data.publicUrl;

      const { error: insertError } = await supabase.from('submissions').insert([
        {
          event_id: eventId,
          photo_url: publicUrl,
          message: message.trim(),
          nickname: nickname.trim() || 'Guest',
          status: 'pending',
        },
      ]);
      if (insertError) throw insertError;

      localStorage.setItem('nickname', nickname);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setPhoto(null);
      setMessage('');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Render ---------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: event?.background_value || 'linear-gradient(180deg,#0d1b2a,#1b263b)',
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
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 16,
          padding: 30,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 30px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <img
          src={event?.logo_url || '/faninteractlogo.png'}
          alt="Logo"
          style={{
            width: 160,
            height: 160,
            objectFit: 'contain',
            marginBottom: -10,
            filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))',
          }}
        />

        {/* Title */}
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
            color: '#1e90ff',
            textShadow: '0 0 12px rgba(30,144,255,0.8)',
            marginTop: -4,
            marginBottom: 20,
            fontWeight: 700,
          }}
        >
          Add Your Photo to the Wall
        </h2>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            onClick={handleCameraClick}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              background: '#1e90ff',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📸 Take Photo
          </button>

          <label
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              background: '#1e90ff',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⬆️ Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Crop Area */}
        <div
          style={{
            width: 280,
            height: 280,
            position: 'relative',
            background: '#111',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {photo ? (
            <Cropper
              image={photo}
              crop={{ x: 0, y: 0 }}
              zoom={1}
              aspect={1}
              onCropChange={() => {}}
              onCropComplete={onCropComplete}
              onZoomChange={() => {}}
            />
          ) : (
            <p
              style={{
                color: '#888',
                fontSize: 14,
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
              }}
            >
              Take or Upload a Photo
            </p>
          )}
        </div>

        {/* Message */}
        <textarea
          placeholder="Write your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: '85%',
            height: 80,
            padding: 10,
            borderRadius: 10,
            border: '1px solid #777',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            fontSize: 16,
            marginBottom: 12,
            textAlign: 'center',
            outline: 'none',
          }}
        />

        {/* Nickname */}
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
            outline: 'none',
          }}
        />

        {error && <p style={{ color: 'salmon', marginBottom: 8 }}>{error}</p>}
        {submitted && <p style={{ color: '#1e90ff', marginBottom: 8 }}>✅ Submitted!</p>}

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
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s ease',
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Post'}
        </button>
      </form>
    </div>
  );
}
