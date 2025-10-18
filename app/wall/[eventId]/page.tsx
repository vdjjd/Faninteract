'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

/* ---------- INTERFACES ---------- */
interface EventData {
  id: string;
  title: string | null;
  status: 'inactive' | 'live';
  countdown: string | null;
  countdown_active?: boolean;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
  qr_url: string | null;
  host_id: string;
}

interface SubmissionData {
  id: string;
  name: string | null;
  message: string | null;
  image_url: string | null;
  created_at: string;
}

/* ---------- COUNTDOWN ---------- */
function CountdownDisplay({
  countdown,
  isActive,
  eventId,
}: {
  countdown: string;
  isActive: boolean;
  eventId: string;
}) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!countdown) return;
    const n = parseInt(countdown.split(' ')[0]);
    const mins = countdown.includes('Minute');
    const secs = countdown.includes('Second');
    const total = mins ? n * 60 : secs ? n : 0;
    setTimeLeft(total);
  }, [countdown]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          supabase.from('events').update({ status: 'live' }).eq('id', eventId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, eventId, timeLeft]);

  if (timeLeft <= 0) return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <div style={{ fontSize: '4vw', fontWeight: 900, lineHeight: 1 }}>
      {m}:{s.toString().padStart(2, '0')}
    </div>
  );
}

/* ---------- MAIN WALL ---------- */
export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [posts, setPosts] = useState<SubmissionData[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD EVENT ---------- */
  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (data) setEvent(data);
      setLoading(false);
    }
    loadEvent();
  }, [eventId]);

  /* ---------- REALTIME EVENT UPDATES ---------- */
  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          const updated = payload.new as Partial<EventData>;
          setEvent((prev) => (prev ? { ...prev, ...updated } : (updated as EventData)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId]);

  /* ---------- LOAD APPROVED POSTS ---------- */
  useEffect(() => {
    if (!eventId) return;
    async function loadPosts() {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });
      if (data) setPosts(data);
    }
    loadPosts();

    const sub = supabase
      .channel('public:submissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const updated = payload.new as SubmissionData;
          if (updated.status === 'approved') {
            setPosts((prev) => {
              const existing = prev.find((p) => p.id === updated.id);
              if (existing) {
                return prev.map((p) => (p.id === updated.id ? updated : p));
              }
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [eventId]);

  /* ---------- FADE BETWEEN POSTS ---------- */
  useEffect(() => {
    if (posts.length === 0 || event?.status !== 'live') return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % posts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [posts, event?.status]);

  if (loading)
    return <p className="text-white text-center mt-20">Loading Wall …</p>;
  if (!event)
    return <p className="text-white text-center mt-20">Event not found.</p>;

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  const currentPost = posts[current];

  return (
    <>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { text-shadow: 0 0 18px rgba(255,255,255,0.3), 0 0 36px rgba(255,255,255,0.2); opacity: 0.95; }
          50% { text-shadow: 0 0 28px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.5); opacity: 1; }
        }
        .pulse { animation: pulseGlow 2.5s ease-in-out infinite; }

        .fade-container { position: relative; width: 100%; height: 100%; overflow: hidden; }
        .fade-item {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          opacity: 0; transition: opacity 1.5s ease-in-out;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; text-align: center;
        }
        .fade-item.active { opacity: 1; }
      `}</style>

      <div
        style={{
          background: bg,
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          transition: 'background 0.8s ease',
        }}
      >
        {/* ---------- TITLE ---------- */}
        <h1
          style={{
            color: '#fff',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(0,0,0,0.6)',
            fontWeight: 900,
            letterSpacing: '1px',
            marginTop: '4vh',
            marginBottom: '2vh',
            fontSize: 'clamp(2.2rem, 4vw, 5rem)',
            lineHeight: 1.1,
          }}
        >
          {event.title || 'Fan Zone Wall'}
        </h1>

        {/* ---------- DISPLAY AREA ---------- */}
        <div
          style={{
            width: '80vw',
            height: '70vh',
            backdropFilter: 'blur(18px)',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 20,
            boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* ---------- LIVE POSTS (FADES) ---------- */}
          {event.status === 'live' && posts.length > 0 ? (
            <div className="fade-container">
              {posts.map((p, i) => (
                <div
                  key={p.id}
                  className={`fade-item ${i === current ? 'active' : ''}`}
                >
                  <img
                    src={p.image_url || ''}
                    alt={p.name || ''}
                    style={{
                      width: '40%',
                      height: 'auto',
                      maxHeight: '50%',
                      borderRadius: 16,
                      objectFit: 'cover',
                      boxShadow: '0 0 30px rgba(0,0,0,0.7)',
                      marginBottom: '2vh',
                    }}
                  />
                  <h2
                    style={{
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '2.5vw',
                      textShadow: '0 0 15px rgba(0,0,0,0.6)',
                    }}
                  >
                    {p.name}
                  </h2>
                  <p
                    style={{
                      color: '#fff',
                      fontSize: '1.6vw',
                      maxWidth: '60%',
                      lineHeight: 1.3,
                      textShadow: '0 0 10px rgba(0,0,0,0.6)',
                    }}
                  >
                    {p.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            /* ---------- IDLE MODE ---------- */
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                textAlign: 'center',
                color: '#fff',
              }}
            >
              {event.countdown ? (
                <>
                  <h2
                    style={{
                      fontWeight: 600,
                      textShadow: '0 0 10px rgba(0,0,0,0.6)',
                      fontSize: 'clamp(1.8rem, 2.4vw, 3rem)',
                      marginBottom: 10,
                    }}
                  >
                    Fan Zone Wall Starting In
                  </h2>
                  <CountdownDisplay
                    countdown={event.countdown}
                    isActive={!!event.countdown_active}
                    eventId={event.id}
                  />
                </>
              ) : (
                <h2
                  className="pulse"
                  style={{
                    fontWeight: 850,
                    textShadow: '0 0 20px rgba(0,0,0,0.8)',
                    margin: 0,
                    fontSize: 'clamp(2.2rem, 3.2vw, 4.2rem)',
                    lineHeight: 1.2,
                  }}
                >
                  Fan Zone Wall
                  <br />
                  Starting Soon!!
                </h2>
              )}
            </div>
          )}

          {/* ---------- SMALL QR (BOTTOM LEFT) ---------- */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              width: 120,
              height: 120,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <QRCodeCanvas
              value={`https://faninteract.vercel.app/submit/${event.id}`}
              size={100}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
          </div>

          {/* ---------- GRAY BAR ---------- */}
          <div
            style={{
              position: 'absolute',
              left: '45%',
              right: '10%',
              height: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 10px rgba(0,0,0,0.6)',
              opacity: 0.8,
            }}
          ></div>

          {/* ---------- LOGO ---------- */}
          <div
            style={{
              position: 'absolute',
              top: '25%',
              right: '10%',
              transform: 'translateY(-50%)',
              width: 'clamp(180px, 20vw, 320px)',
            }}
          >
            <img
              src={event.logo_url || '/faninteractlogo.png'}
              alt="Logo"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.85))',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
