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
  const [isNameLoaded, setIsNameLoaded] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  /* ---------- Load guest name from guest_profiles table ---------- */
  useEffect(() => {
    if (!eventUUID) {
      setIsNameLoaded(true);
      return;
    }

    // Use device_id or some identifier from localStorage to find the guest profile
    const stored = typeof window !== 'undefined' ? localStorage.getItem('guestProfile') : null;
    console.log('🧪 [SubmitPage] guestProfile from localStorage:', stored);

    let device_id: string | null = null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        device_id = parsed.device_id || null;
        console.log('🔍 parsed device_id:', device_id);
      } catch (err) {
        console.error('❌ Error parsing guestProfile from localStorage:', err);
      }
    }

    if (!device_id) {
      console.warn('⚠ No device_id found in localStorage; cannot auto-fetch first name');
      setIsNameLoaded(true);
      return;
    }

    // Fetch from guest_profiles table where device_id = stored device_id
    (async () => {
      try {
        const { data, error } = await supabase
          .from('guest_profiles')
          .select('first_name')
          .eq('device_id', device_id)
          .single();
        if (error) {
          console.error('❌ Error fetching guest_profiles first_name:', error);
        } else if (data) {
          const name = data.first_name;
          setFirstName(name.trim());
          console.log('✅ Auto-filled name from guest_profiles:', name.trim());
        }
      } catch (err) {
        console.error('❌ Unexpected error fetching guest_profiles:', err);
      } finally {
        setIsNameLoaded(true);
      }
    })();
  }, [eventUUID]);

  /* ---------- File & Crop Logic ---------- */
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

    let guest_profile_id: string | null = null;
    let guest_id: string | null = null;

    const stored2 = typeof window !== 'undefined' ? localStorage.getItem('guestProfile') : null;
    if (stored2) {
      try {
        const parsed2 = JSON.parse(stored2);
        guest_profile_id = parsed2.id || null;
        guest_id = parsed2.guest_id || null;
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

  if (!isNameLoaded) {
    return (
      <div style={{
        background: '#000',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <p>Loading …</p>
      </div>
    );
  }

  return (
    <div style={{
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
    }}>
      <form onSubmit={handleSubmit} style={{
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
      }}>
        <h2 style={{ marginBottom: 14, fontWeight: 700 }}>
          Add Your Photo to the Wall
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap:12, marginBottom:12 }}>
          <button type="button" onClick={handleCameraCapture} style={buttonStyle}>
            📷 Camera
          </button>
          <button type="button" onClick={() => document.getElementById('file-input')?.click()} style={buttonStyle}>
            📁 Upload
          </button>
          <input type="file" id="file-input" accept="image/*" onChange={handleFileSelect} style={{ display:'none' }} />
        </div>

        <div style={{
          position:'relative',
          width:280,
          height:280,
          background:'#111',
          borderRadius:12,
          overflow:'hidden',
          marginBottom:16
        }}>
          { imageSrc ? (
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
            <div style={{
              position:'absolute',
              inset:0,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              color:'#888',
              fontSize:14
            }}>
              Take a photo or upload one to begin
            </div>
          )}
        </div>

        <input
          type="text"
          name="first_name"
          id="first_name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          style={{
            width:'90%',
            margin:'0 auto 12px',
            display:'block',
            padding:10,
            borderRadius:8,
            border:'1px solid #666',
            background:'rgba(255,255,255,0.1)',
            color:'#fff',
            fontSize:15,
            textAlign:'center',
            opacity:0.7
          }}
        />

        <textarea
          name="message"
          id="message"
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width:'90%',
            margin:'0 auto 10px',
            display:'block',
            padding:10,
            borderRadius:8,
            border:'1px solid #666',
            background:'rgba(0,0,0,0.4)',
            color:'#fff',
            fontSize:15,
            textAlign:'center',
            resize:'none',
            minHeight:70
          }}
        />

        <button type="submit" disabled={submitting} style={{
          ...buttonStyle,
          width:'90%',
          padding:'12px 0',
          fontSize:16,
          cursor: submitting ? 'not-allowed' : 'pointer'
        }}>
          { submitting ? 'Submitting…' : 'Submit' }
        </button>
      </form>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  backgroundColor:'#1e90ff',
  border:'none',
  borderRadius:8,
  color:'#fff',
  fontWeight:600,
  padding:'10px 18px',
  cursor:'pointer',
  fontSize:14,
  transition:'background 0.3s ease'
};
