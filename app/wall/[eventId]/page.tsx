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
}

export default function FanWallPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [posts, setPosts] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdownTime, setCountdownTime] = useState<number | null>(null);

  // ---------------- FETCH EVENT + POSTS ----------------
  async function loadEventAndPosts() {
    if (!eventId) return;
    const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (!ev) return setLoading(false);
    setEvent(ev);

    if (ev.countdown && ev.countdown !== '0 Seconds') {
      const parts = ev.countdown.split(' ');
      const val = parseInt(parts[0]);
      const unit = parts[1]?.toLowerCase();
      let seconds = val;
      if (unit.includes('minute')) seconds = val * 60;
      else if (unit.includes('second')) seconds = val;
      setCountdownTime(seconds);
    }

    if (ev.status === 'live') {
      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      setPosts(subs || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEventAndPosts();
  }, [eventId]);

  // ---------------- REALTIME UPDATES ----------------
  useEffect(() => {
    if (!eventId) return;

    const subChannel = supabase
      .channel('realtime:submissions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const newPost = payload.new as Submission;
          if (newPost.event_id === eventId && newPost.status === 'approved') {
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .subscribe();

    const eventChannel = supabase
      .channel('realtime:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          const updated = payload.new as EventData;
          if (updated) setEvent((prev) => ({ ...prev!, ...updated }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
      supabase.removeChannel(eventChannel);
    };
  }, [eventId]);

  // ---------------- COUNTDOWN TIMER ----------------
  useEffect(() => {
    if (!countdownTime || countdownTime <= 0) return;
    const timer = setInterval(() => {
      setCountdownTime((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownTime]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m > 0 ? `${m}m ` : ''}${sec}s`;
  };

  const getBackground = (bg?: string, type?: string | null) => {
    if (!bg) return 'linear-gradient(to bottom right, #4dc6ff, #001f4d)';
    if (type === 'image') return `url(${bg}) center/cover no-repeat`;
    return bg;
  };

  if (loading) return <p className="text-white text-center mt-20">Loading Wall...</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  const logo = event.logo_url || '/faninteractlogo.png';
  const qr = event.qr_url;

  // ---------------- RENDER ----------------
  return (
    <>
      {/* 🔥 Inline Keyframes for Fade Animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        className="min-h-screen text-white relative overflow-hidden"
        style={{
          background: getBackground(event.background_value ?? '', event.background_type),
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          transition: 'background 0.3s ease',
        }}
      >
        <div className="absolute inset-0 bg-black/40 z-10" />

        {/* INACTIVE STATE */}
        {event.status !== 'live' && (
          <div className="relative z-20 flex flex-col items-center justify-center h-screen px-8">
            {/* Top Title */}
            <h1 className="text-4xl font-bold mb-6 text-center drop-shadow-lg">
              {event.title || 'Fan Zone Wall'}
            </h1>

            {/* Center Card with Fade */}
            <div
              className="flex flex-col items-center justify-center p-10 rounded-2xl shadow-2xl backdrop-blur-md bg-white/10 border border-white/20
                         opacity-0 animate-[fadeIn_1.5s_ease_forwards]"
              style={{
                minWidth: '60%',
                maxWidth: 800,
                textAlign: 'center',
              }}
            >
              {/* Logo */}
              <img
                src={logo}
                alt="Logo"
                style={{ width: 200, objectFit: 'contain', marginBottom: 10 }}
              />

              {/* Divider */}
              <div className="w-3/4 h-px bg-gray-400/40 mb-6" />

              {/* Text */}
              <h2 className="text-2xl font-semibold mb-4">
                Fan Zone Wall Beginning Soon
              </h2>

              {/* Countdown */}
              {countdownTime && countdownTime > 0 && (
                <div className="text-lg font-mono text-white/90 mt-2">
                  {formatTime(countdownTime)}
                </div>
              )}
            </div>

            {/* QR Code (bottom left) */}
            {qr && (
              <div className="absolute bottom-6 left-6">
                <img
                  src={qr}
                  alt="QR"
                  className="w-32 h-32 rounded-lg shadow-lg border border-white/20"
                />
                <p className="text-xs text-center mt-1 opacity-75">Scan to Join</p>
              </div>
            )}
          </div>
        )}

        {/* LIVE WALL */}
        {event.status === 'live' && (
          <div className="relative z-20 w-full flex flex-col items-center px-8 py-10">
            <img
              src={logo}
              alt="Logo"
              style={{ width: 240, objectFit: 'contain', opacity: 0.9, pointerEvents: 'none' }}
            />
            <h1 className="text-3xl font-extrabold text-center my-6">
              {event.title || 'Post Your Best Photos To The Wall!'}
            </h1>

            {posts.length === 0 ? (
              <p className="mt-32 text-white/80">No posts yet — be the first to join in!</p>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full max-w-6xl">
                {posts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-lg hover:bg-white/20 transition-all"
                  >
                    {p.photo_url && (
                      <img
                        src={p.photo_url}
                        alt={p.nickname}
                        className="rounded-lg w-full h-52 object-cover mb-3 border border-white/10"
                      />
                    )}
                    <p className="font-semibold text-lg">{p.nickname}</p>
                    <p className="text-sm opacity-90">{p.message}</p>
                  </div>
                ))}
              </div>
            )}

            {qr && (
              <footer className="absolute bottom-4 left-4">
                <img src={qr} alt="QR" className="w-32 h-32 rounded-lg shadow-lg" />
                <p className="text-xs text-center mt-1 opacity-75">Scan to Join</p>
              </footer>
            )}
          </div>
        )}

        {/* Fullscreen Button */}
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            width: 48,
            height: 48,
            borderRadius: 10,
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="white"
            style={{ width: 26, height: 26 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"
            />
          </svg>
        </div>
      </div>
    </>
  );
}
