'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function GuestPostPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  /* ---------------- LOAD EVENT ---------------- */
  useEffect(() => {
    async function fetchEvent() {
      const { data } = await supabase
        .from('events')
        .select('title, background_value, logo_url')
        .eq('id', eventId)
        .single();
      if (data) setEvent(data);
      setLoading(false);
    }
    if (eventId) fetchEvent();
  }, [eventId]);

  /* ---------------- HANDLE PHOTO ---------------- */
  const handlePhotoChange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  /* ---------------- SUBMIT ---------------- */
  async function handleSubmit(e: any) {
    e.preventDefault();
    setError('');
    if (!message && !photo) return setError('Please add a message or photo.');

    setSubmitting(true);

    let photoUrl: string | null = null;

    if (photo) {
      const fileName = `${eventId}/${Date.now()}-${photo.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, photo);

      if (uploadError) {
        console.error('Upload failed:', uploadError);
        setError('Error uploading photo.');
        setSubmitting(false);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName);

      photoUrl = publicUrl?.publicUrl || null;
    }

    const { error: insertError } = await supabase.from('submissions').insert([
      {
        event_id: eventId,
        message: message.trim(),
        nickname: nickname.trim() || null,
        photo_url: photoUrl,
        status: 'pending',
      },
    ]);

    if (insertError) {
      console.error('Insert failed:', insertError);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    // Fade animation before redirect
    const formEl = document.getElementById('post-form');
    formEl?.animate(
      [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-20px)' }],
      { duration: 600, easing: 'ease-in-out', fill: 'forwards' }
    );

    await new Promise((res) => setTimeout(res, 600));
    router.push(`/submit/${eventId}/thankyou`);
  }

  if (loading)
    return <p style={{ textAlign: 'center', color: '#fff' }}>Loading...</p>;

  /* ---------------- RENDER ---------------- */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <form
        id="post-form"
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background:
            event?.background_value ||
            'linear-gradient(180deg,#0d1b2a,#1b263b)',
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
        {/* ---------- LOGO ---------- */}
        <img
          src={event?.logo_url || '/faninteractlogo.png'}
          alt="Logo"
          style={{
            width: 300,
            height: 300,
            objectFit: 'contain',
            marginBottom: -6,
            marginTop: -20,
            filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))',
          }}
        />

        <h2
          style={{
            fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
            marginTop: -12,
            marginBottom: 10,
            fontWeight: 700,
            textShadow: '0 0 12px rgba(0,0,0,0.6)',
          }}
        >
          {event?.title || 'FanInteract Wall'}
        </h2>

        <p style={{ fontSize: 14, color: '#ddd', marginBottom: 20 }}>
          Add your photo and message to the wall!
        </p>

        {/* ---------- PHOTO UPLOAD ---------- */}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              width: '85%',
              borderRadius: 10,
              marginBottom: 12,
              objectFit: 'cover',
              boxShadow: '0 0 10px rgba(255,255,255,0.2)',
            }}
          />
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          style={{
            color: '#ccc',
            marginBottom: 12,
            width: '85%',
            textAlign: 'center',
          }}
        />

        <textarea
          placeholder="Write your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: '85%',
            minHeight: 80,
            padding: '10px',
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

        <input
          type="text"
          placeholder="Nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{
            width: '85%',
            padding: '10px',
            marginBottom: 12,
            borderRadius: 10,
            border: '1px solid #777',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            fontSize: 16,
            textAlign: 'center',
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
          {submitting ? 'Posting...' : 'Submit to Wall'}
        </button>
      </form>
    </div>
  );
}
