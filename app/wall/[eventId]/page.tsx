'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Submission {
  id: string;
  event_id: string;
  nickname: string;
  message: string;
  photo_url: string | null;
  status: string;
  created_at: string;
}

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
  theme_colors?: string | null;
}

export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [posts, setPosts] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdownTime, setCountdownTime] = useState<number | null>(null);

  // ---------------- FETCH EVENT + POSTS ----------------
  useEffect(() => {
    if (!eventId) return;

    async function load() {
      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (!ev) return setLoading(false);
      setEvent(ev);

      if (ev.status === 'live') {
        const { data: subs } = await supabase
          .from('submissions')
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        setPosts(subs || []);
      }

      if (ev.countdown) {
        const diff = new Date(ev.countdown).getTime() - Date.now();
        setCountdownTime(diff > 0 ? diff : 0);
      }

      setLoading(false);
    }

    load();
  }, [eventId]);

  // ---------------- REALTIME SUBSCRIPTIONS ----------------
  useEffect(() => {
    if (!eventId) return;

    // 1️⃣ Submissions Realtime Channel
    const subChannel = supabase
      .channel('realtime:submissions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const newPost = payload.new as Submission;
          if (newPost.event_id === eventId && newPost.status === 'approved') {
            console.log('🆕 New approved post:', newPost);
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .subscribe((status) => console.log('Submissions channel:', status));

    // 2️⃣ Events Realtime Channel (listen for live background/status changes)
    const eventChannel = supabase
      .channel('realtime:events')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          const updated = payload.new as EventData;
          console.log('🔁 Realtime event update:', updated);
          setEvent((prev) => ({ ...prev!, ...updated }));
        }
      )
      .subscribe((status) => console.log('Events channel:', status));

    return () => {
      supabase.removeChannel(subChannel);
      supabase.removeChannel(eventChannel);
    };
  }, [eventId]);

  // ---------------- FADE BACKGROUND WHEN UPDATED ----------------
  useEffect(() => {
    const root = document.documentElement;
    if (event?.background_value) {
      root.style.transition = 'background 2s ease';
      root.style.background = event.background_value;
    }
  }, [event?.background_value]);

  // ---------------- COUNTDOWN TIMER ----------------
  useEffect(() => {
    if (!countdownTime) return;
    const interval = setInterval(() => {
      setCountdownTime((prev) => (prev && prev > 1000 ? prev - 1000 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownTime]);

  // ---------------- BACKGROUND STYLE ----------------
  const getBackground = () => {
    if (!event) return 'linear-gradient(to bottom right, #4dc6ff, #001f4d)';
    if (event.background_type === 'image' && event.background_value)
      return `url(${event.background_value}) center/cover no-repeat`;
    if (event.background_type === 'solid' && event.background_value)
      return event.background_value;
    if (event.background_type === 'gradient' && event.background_value)
      return event.background_value;
    return 'linear-gradient(to bottom right, #4dc6ff, #001f4d)';
  };

  const bgStyle: React.CSSProperties = {
    background: getBackground(),
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    transition: 'background 2s ease',
    minHeight: '100vh',
    width: '100%',
  };

  // ---------------- TIMER FORMAT ----------------
  const formatCountdown = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (loading) return <p className="text-white text-center mt-20">Loading Wall...</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  const now = Date.now();
  const countdownActive =
    event.countdown && new Date(event.countdown).getTime() > now && event.status !== 'live';

  const logo = event.logo_url || '/faninteractlogo.png';
  const qr = event.qr_url;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white relative overflow-hidden"
      style={bgStyle}
    >
      {/* translucent overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* ---------- LIVE WALL ---------- */}
      {event.status === 'live' && !countdownActive && (
        <div
          className="relative z-10 w-full flex flex-col"
          style={{
            padding: '80px 100px 60px 100px',
            boxSizing: 'border-box',
          }}
        >
          <header className="flex justify-between items-center px-6 py-4 relative">
            <img
              src={logo}
              alt="Logo"
              style={{
                width: '300px',
                height: '300px',
                objectFit: 'contain',
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: 0.9,
                pointerEvents: 'none',
              }}
            />
            <h1
              className="text-2xl md:text-4xl font-extrabold tracking-wide text-center w-full drop-shadow-lg"
              style={{ marginTop: '40px' }}
            >
              {event.title || 'Post Your Best Photos To The Wall!'}
            </h1>
          </header>

          <main
            className="flex-1 flex flex-col items-center justify-start px-4 pb-24 w-full max-w-6xl mx-auto"
            style={{
              marginTop: '50px',
              paddingBottom: '80px',
            }}
          >
            {posts.length === 0 ? (
              <p className="text-center text-white/80 mt-32">
                No posts yet — be the first to join in!
              </p>
            ) : (
              <div
                className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full"
                style={{
                  maxWidth: '1600px',
                  margin: '0 auto',
                }}
              >
                {posts.map((post, idx) => (
                  <div
                    key={post.id}
                    className={`bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-lg transition-all duration-300 hover:bg-white/20 ${
                      idx % 2 === 0 ? 'justify-self-start' : 'justify-self-end'
                    }`}
                  >
                    {post.photo_url && (
                      <img
                        src={post.photo_url}
                        alt={post.nickname}
                        className="rounded-lg w-full h-52 object-cover mb-3 border border-white/10"
                      />
                    )}
                    <p className="font-semibold text-lg">{post.nickname}</p>
                    <p className="text-sm opacity-90">{post.message}</p>
                  </div>
                ))}
              </div>
            )}
          </main>

          {qr && (
            <footer className="absolute bottom-4 left-4">
              <img src={qr} alt="QR" className="w-32 h-32 rounded-lg shadow-lg" />
              <p className="text-xs text-center mt-1 opacity-75">Scan to Join</p>
            </footer>
          )}
        </div>
      )}

      {/* ✅ Fullscreen Toggle Button */}
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          width: 48,
          height: 48,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'opacity 0.3s ease',
          opacity: 0.15,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.15')}
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
          } else {
            document.exitFullscreen();
          }
        }}
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: 26, height: 26 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>
    </div>
  );
}
