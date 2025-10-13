'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface EventData {
  id: string;
  title: string | null;
  status: 'inactive' | 'live';
  countdown: string | null;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
  qr_url: string | null;
  host_id: string;
}

export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  async function loadEvent() {
    if (!eventId) return;
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (data) setEvent(data);
    setLoading(false);
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`events-changes-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          const updated = payload.new as Partial<EventData>;
          setEvent((prev) => (prev ? { ...prev, ...updated } : (updated as EventData)));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [eventId]);

  // Countdown logic
  useEffect(() => {
    if (!event?.countdown) {
      setTimeLeft(null);
      return;
    }
    const countdownDate = new Date(event.countdown).getTime();
    const timer = setInterval(() => {
      const diff = countdownDate - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [event?.countdown]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getBackground = (bg?: string, type?: string | null) => {
    if (!bg) return 'linear-gradient(to bottom right, #1b2735, #090a0f)';
    if (type === 'image') return `url(${bg}) center/cover no-repeat`;
    return bg;
  };

  if (loading) return <p className="text-white text-center mt-20">Loading Wall …</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  return (
    <>
      <div
        style={{
          background: getBackground(event.background_value ?? '', event.background_type),
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          transition: 'background 0.8s ease',
        }}
      >
        {/* ---- Title ---- */}
        <h1
          style={{
            color: 'white',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(0,0,0,0.6)',
            fontWeight: 900,
            letterSpacing: '1px',
            width: '80%',
            maxWidth: '1600px',
            marginTop: '4vh',
            marginBottom: '2vh',
            fontSize: 'clamp(2rem, 5vw, 5rem)',
            lineHeight: '1.1',
          }}
        >
          {event.title || 'Fan Zone Wall'}
        </h1>

        {/* ---- MSV Container ---- */}
        <div
          style={{
            width: '75vw',
            height: '70vh',
            backdropFilter: 'blur(18px)',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            boxShadow: '10px 10px 30px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            color: 'white',
            textAlign: 'center',
            fontSize: '1.8rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* ---- QR Code ---- */}
          <div
            style={{
              flexBasis: '45%',
              height: 'calc(100% - 40px)',
              marginLeft: '20px',
              marginTop: '20px',
              marginBottom: '20px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 15px rgba(255,255,255,0.1)',
              position: 'relative',
            }}
          >
            {event.qr_url ? (
              <img
                src={event.qr_url}
                alt="QR Code"
                style={{ width: '75%', height: 'auto', borderRadius: '12px' }}
              />
            ) : (
              <p style={{ fontSize: '1rem', opacity: 0.7 }}>QR Placeholder</p>
            )}
          </div>

          {/* ---- Logo ---- */}
          <div
            style={{
              position: 'absolute',
              left: '73%',
              top: '22%',
              transform: 'translate(-50%, -50%)',
              width: '540px',
              height: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <
