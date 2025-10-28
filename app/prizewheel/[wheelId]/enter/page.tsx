'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';
import { supabase } from '@/lib/supabaseClient';

/* ------------------------------------------------------------- */
/* 🎡 PRIZE WHEEL ENTRY PAGE (with facial cropper)               */
/* ------------------------------------------------------------- */
export default function PrizeWheelEnterPage() {
  const { wheelId } = useParams();
  const router = useRouter();

  const [wheel, setWheel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [guestId, setGuestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Photo / crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  /* ---------- LOAD PRIZE WHEEL INFO ---------- */
  useEffect(() => {
    async function loadWheel() {
      const { data, error } = await supabase
        .from('prize_wheels')
        .select('*')
        .eq('id', wheelId)
        .maybeSingle();
      if (error) console.error('Error loading wheel:', error);
      if (data) setWheel(data);
      setLoading(false);
    }
    loadWheel();
  }, [wheelId]);

  /* ---------- LOAD EXISTING GUEST ---------- */
  useEffect(() => {
    const stored = localStorage.getItem('guestProfile');
    if (!stored) return;
    try {
      const guest = JSON.parse(stored);
      setGuestId(guest.id);
      setFirstName(guest.firstName || '');
    } catch (err) {
      console.error('Error loading guest from localStorage:', err);
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
    input.capture = 'user';
    input.onchange = handleFileSelect;
    input.click();
  };

  const onCropComplete = useCallback((_: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
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

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
    });
  }

  /* ---------- Submit ---------- */
  async function handleEnter(e: any) {
    e.preventDefault();
    setError('');

    if (!guestId) {
      setError('Please sign up on a Fan Zone page first.');
      return;
    }
    if (!imageSrc) {
      setError('You must submit a clear facial photo.');
      return;
    }
    if (wheel.visibility === 'private') {
      if (!passphrase.trim()) {
        setError('Please enter the passphrase.');
        return;
      }
      if (passphrase.trim() !== wheel.passphrase) {
        setError('Incorrect passphrase.');
        return;
      }
    }

    setSubmitting(true);

    // Already entered?
    const { data: existing } = await supabase
      .from('prizewheel_participants')
      .select('id')
      .eq('wheel_id', wheelId)
      .eq('guest_profile_id', guestId)
      .maybeSingle();

    if (existing) {
      setError('You’ve already entered this drawing.');
      setSubmitting(false);
      return;
    }

    // Crop + upload
    const croppedBlob = await getCroppedImage();
    if (!croppedBlob) {
      setError('Error processing cropped image.');
      setSubmitting(false);
      return;
    }

    const fileName = `prize_selfie_${guestId}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, croppedBlob, { contentType: 'image/jpeg' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setError('Failed to upload photo.');
      setSubmitting(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);
    const photoUrl = publicUrlData?.publicUrl || null;

    // Insert participant
    const { error: insertError } = await supabase
      .from('prizewheel_participants')
      .insert([
        {
          wheel_id: wheelId,
          guest_profile_id: guestId,
          first_name: firstName || 'Guest',
          photo_url: photoUrl,
        },
      ]);

    if (insertError) {
      console.error('Insert error:', insertError);
      setError('Error entering the drawing.');
      setSubmitting(false);
      return;
    }

    router.push(`/thanks/${wheelId}`);
  }

  /* ---------- Render ---------- */
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-xl">
        Loading Prize Wheel...
      </div>
    );

  if (!wheel)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-xl">
        Prize Wheel not found.
      </div>
    );

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          wheel.background_value || 'linear-gradient(135deg,#0d47a1,#1976d2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: 20,
      }}
    >
      <form
        onSubmit={handleEnter}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 16,
          padding: 30,
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 10 }}>
          {wheel.title || 'Prize Wheel Entry'}
        </h2>

        <p style={{ fontSize: 14, marginBottom: 16, color: '#ccc' }}>
          Submit a <strong>clear facial photo</strong>. Your name & photo will
          appear on the spinning wheel and winner screen.
        </p>

        {/* Upload Buttons */}
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

        {/* Cropper */}
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
              onZoomChange={setZoom}
              zoom={zoom}
              cropShape="rect"
              aspect={1}
              showGrid={false}
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
                color: '#777',
                fontSize: 14,
              }}
            >
              Take or upload a selfie to begin
            </div>
          )}
        </div>

        {/* First Name */}
        <input
          type="text"
          value={firstName}
          readOnly
          style={{
            width: '85%',
            padding: '10px',
            borderRadius: 10,
            border: '1px solid #888',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 12,
            opacity: 0.8,
          }}
        />

        {/* Passphrase */}
        {wheel.visibility === 'private' && (
          <input
            type="text"
            placeholder="Passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            style={{
              width: '85%',
              padding: '10px',
              borderRadius: 10,
              border: '1px solid #888',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 16,
              textAlign: 'center',
              marginBottom: 12,
            }}
          />
        )}

        {error && (
          <p style={{ color: 'salmon', fontSize: 14, marginBottom: 10 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '85%',
            backgroundColor: submitting ? '#555' : '#1e90ff',
            border: 'none',
            padding: '12px 0',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
            cursor: submitting ? 'not-allowed' : 'pointer',
            marginTop: 6,
          }}
        >
          {submitting ? 'Submitting...' : 'Enter Drawing'}
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