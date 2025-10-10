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

  // Track background fade
  const [bgTransition, setBgTransition] = useState({
    current: '',
    next: '',
    fading: false,
  });

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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const newPost = payload.new as Submission;
          if (newPost.event_id === eventId && newPost.status === 'approved') {
            console.log('🆕 new post', newPost);
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .subscribe((s) => console.log('Submissions channel:', s));

    const eventChannel = supabase
      .channel('realtime:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          console.log('🔥 Realtime event update:', payload);
          const updated = payload.new as EventData;
          if (updated) setEvent((prev) => ({ ...prev!, ...updated }));
        }
      )
      .subscribe((s) => console.log('Events channel:', s));

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
        console.log('🔄 Poll update', data);
        setEvent(data);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [eventId, event]);

  // ---------------- HANDLE BACKGROUND CHANGES ----------------
  useEffect(() => {
    if (!event?.background_value) return;
    if (event.background_value === bgTransition.current) return;

    setBgTransition({
      current: bgTransition.current || event.background_value,
      next: event.background_value,
      fading: true,
    });

    const timer = setTimeout(() => {
      setBgTransition({
        current: event.background_value,
        next: '',
        fading: false,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [event?.background_value]);

  const getBackground = (bg?: string, type?: string | null) => {
    if (!bg) return 'linear-gradient(to bottom right,#4dc6ff,#001f4d)';
    if (type === 'image') return `url(${bg}) center/cover no-repeat`;
    return bg;
  };

  if (loading) return <p className="text-white text-center mt-20">Loading Wall...</p>;
  if (!event) return <p className="text-white text-center mt-20">Event not found.</p>;

  const logo = event.logo_url || '/faninteractlogo.png';
  const qr = event.qr_url;

  // ---------------- RENDER ----------------
  return (
    <div
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background: getBackground(bgTransition.current, event.background_type),
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        transition: bgTransition.fading ? 'none' : 'background 2s ease',
      }}
    >
      {/* Crossfade layer */}
      {bgTransition.fading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: getBackground(bgTransition.next, event.background_type),
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            opacity: 0,
            animation: 'fadeGradient 2s ease forwards',
            zIndex: 0,
          }}
        />
      )}

      {/* dark overlay */}
      <div className="absolute inset-0 bg-black/40 z-10" />

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
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: 26, height: 26 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>

      {/* CSS animation for smooth crossfade */}
      <style jsx global>{`
        @keyframes fadeGradient {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
