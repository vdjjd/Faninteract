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

  // ---------------- FETCH EVENT + POSTS ----------------
  async function loadEventAndPosts() {
    if (!eventId) return;
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, (payload) => {
        const newPost = payload.new as Submission;
        if (newPost.event_id === eventId && newPost.status === 'approved') {
          setPosts((prev) => [newPost, ...prev]);
        }
      })
      .subscribe();

    const eventChannel = supabase
      .channel('realtime:events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload) => {
        const updated = payload.new as EventData;
        if (updated) setEvent((prev) => ({ ...prev!, ...updated }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
      supabase.removeChannel(eventChannel);
    };
  }, [eventId]);

  // ---------------- POLLING FALLBACK ----------------
  useEffect(() => {
    if (!eventId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (data && JSON.stringify(data) !== JSON.stringify(event)) {
        setEvent(data);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [eventId, event]);

  const getBackground = (bg?: string, type?: string | null) => {
    if (!bg) return 'linear-gradient(to bottom right, #4dc6ff, #001f4d)';
    if (type === 'image') return `url(${bg}) center/cover no-repeat`;
    return bg;
  };

  if (loading) return <p className="text-white text-center mt-20">Loading Wall...</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  const logo = event.logo_url || '/faninteractlogo.png';
  const qr = event.qr_url;

  // ---------------- INACTIVE LAYOUT ----------------
  const InactiveWall = () => (
    <div
      className="relative z-20 w-full h-full min-h-screen flex flex-col items-center justify-start"
      style={{
        background: getBackground(event.background_value ?? '', event.background_type),
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/40 z-10" />
      <header className="relative z-20 text-center py-6 w-full bg-black/30 backdrop-blur-md shadow-md">
        <h1 className="text-3xl font-extrabold text-white tracking-wide">
          {event.title || 'Fan Zone Wall'}
        </h1>
      </header>

      <div className="relative z-20 grid grid-cols-2 gap-10 items-center justify-center w-full max-w-6xl px-10 py-16">
        {/* LEFT SIDE - QR Code */}
        <div className="flex justify-center items-center">
          {qr ? (
            <div className="p-6 bg-white/10 rounded-2xl shadow-2xl backdrop-blur-md">
              <img src={qr} alt="QR Code" className="w-72 h-72 rounded-lg shadow-lg" />
            </div>
          ) : (
            <div className="w-72 h-72 flex items-center justify-center rounded-2xl bg-white/10 text-white/60 backdrop-blur-md shadow-lg font-semibold text-lg">
              QR Code Here
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Logo, Divider, Text, Countdown */}
        <div className="flex flex-col justify-center items-center text-center space-y-6 bg-white/10 backdrop-blur-md p-10 rounded-2xl shadow-2xl">
          <img src={logo} alt="Logo" className="w-56 object-contain opacity-90" />
          <div className="w-3/4 h-px bg-white/40 my-2"></div>
          <h2 className="text-2xl font-bold text-white">Fan Zone Wall Beginning Soon</h2>

          {event.countdown && event.countdown !== '0 Seconds' && (
            <div className="px-6 py-3 bg-white/20 rounded-lg text-xl font-semibold text-white shadow-md">
              Countdown: {event.countdown}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ---------------- LIVE LAYOUT ----------------
  const LiveWall = () => (
    <div className="relative z-20 w-full flex flex-col items-center px-8 py-10">
      <img src={logo} alt="Logo" style={{ width: 240, objectFit: 'contain', opacity: 0.9, pointerEvents: 'none' }} />
      <h1 className="text-3xl font-extrabold text-center my-6">
        {event.title || 'Post Your Best Photos To The Wall!'}
      </h1>

      {posts.length === 0 ? (
        <p className="mt-32 text-white/80">No posts yet — be the first to join in!</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full max-w-6xl">
          {posts.map((p) => (
            <div key={p.id} className="bg-white/10 backdrop-blur-sm p-3 rounded-xl shadow-lg hover:bg-white/20 transition-all">
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
  );

  // ---------------- RENDER ----------------
  return (
    <div
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background: getBackground(event.background_value ?? '', event.background_type),
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        transition: 'background 0.3s ease',
        width: '100%',
      }}
    >
      <div className="absolute inset-0 bg-black/40 z-10" />
      {event.status === 'live' ? <LiveWall /> : <InactiveWall />}

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
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: 26, height: 26 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>
    </div>
  );
}
