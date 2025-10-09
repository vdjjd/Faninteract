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
  countdown: string | null; // ISO time or seconds
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

  // ---------------- FETCH DATA ----------------
  useEffect(() => {
    if (!eventId) return;
    async function load() {
      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (!ev) return setLoading(false);
      setEvent(ev);

      // load posts only if live
      if (ev.status === 'live') {
        const { data: subs } = await supabase
          .from('submissions')
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        setPosts(subs || []);
      }

      // handle countdown
      if (ev.countdown) {
        const diff = new Date(ev.countdown).getTime() - Date.now();
        setCountdownTime(diff > 0 ? diff : 0);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

  // ---------------- LIVE UPDATES ----------------
  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel('realtime:submissions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const newPost = payload.new as Submission;
          if (newPost.event_id === eventId && newPost.status === 'approved') {
            setPosts((p) => [newPost, ...p]);
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [eventId]);

  // ---------------- COUNTDOWN TIMER ----------------
  useEffect(() => {
    if (!countdownTime) return;
    const interval = setInterval(() => {
      setCountdownTime((prev) => (prev && prev > 1000 ? prev - 1000 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownTime]);

  // ---------------- BACKGROUND LOGIC ----------------
  const getBackground = () => {
    if (!event) return 'bg-gradient-to-br from-[#4dc6ff] to-[#001f4d]';
    if (event.background_type === 'image' && event.background_value)
      return `url(${event.background_value}) center/cover no-repeat`;
    if (event.background_type === 'solid' && event.background_value)
      return event.background_value;
    if (event.background_type === 'gradient' && event.background_value)
      return event.background_value;
    return 'linear-gradient(to bottom right, #4dc6ff, #001f4d)';
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

  // ---------------- RENDER STATES ----------------
  const now = Date.now();
  const countdownActive =
    event.countdown && new Date(event.countdown).getTime() > now && event.status !== 'live';

  const bgStyle =
    event.background_type === 'image'
      ? { background: getBackground() }
      : { backgroundImage: getBackground() };

  const logo =
    event.logo_url || '/faninteractlogo.png';
  const qr = event.qr_url;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white relative overflow-hidden"
      style={bgStyle}
    >
      <div className="absolute inset-0 bg-black/50" />

      {/* ---------- INACTIVE ---------- */}
      {event.status === 'inactive' && !countdownActive && (
        <div className="relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 drop-shadow-lg">
            {event.title || 'Fan Wall Coming Soon'}
          </h1>
          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            {qr && (
              <div className="text-center">
                <img src={qr} alt="QR" className="w-48 h-48 mx-auto rounded-lg shadow-lg" />
                <p className="mt-2 text-sm opacity-80">Scan to Join</p>
              </div>
            )}
            <div className="flex flex-col items-center">
              <img src={logo} alt="Logo" className="w-32 h-32 object-contain mb-4" />
              <p className="text-lg opacity-90">Beginning soon.</p>
            </div>
          </div>
        </div>
      )}

      {/* ---------- COUNTDOWN ---------- */}
      {countdownActive && (
        <div className="relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 drop-shadow-lg">
            {event.title || 'Get Ready — The Fan Wall Goes Live Soon!'}
          </h1>
          <div className="flex flex-col items-center justify-center">
            <p className="text-7xl md:text-8xl font-mono font-bold drop-shadow-xl mb-4">
              {formatCountdown(countdownTime ?? 0)}
            </p>
            {qr && (
              <div className="text-center mt-4">
                <img src={qr} alt="QR" className="w-44 h-44 mx-auto rounded-lg shadow-lg" />
                <p className="mt-2 text-sm opacity-80">Scan to Join</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- LIVE ---------- */}
      {event.status === 'live' && !countdownActive && (
        <div className="relative z-10 w-full flex flex-col">
          {/* Header */}
          <header className="flex justify-between items-center px-6 py-4">
            <img src={logo} alt="Logo" className="h-14 object-contain" />
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-wide">
              {event.title || 'Post Your Best Photos To The Wall!'}
            </h1>
          </header>

          {/* Posts Grid */}
          <main className="flex-1 flex flex-col items-center justify-start px-4 pb-24 w-full max-w-6xl mx-auto">
            {posts.length === 0 ? (
              <p className="text-center text-white/80 mt-32">
                No posts yet — be the first to join in!
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 w-full">
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
                        className="rounded-lg w-full h-48 object-cover mb-3 border border-white/10"
                      />
                    )}
                    <p className="font-semibold text-lg">{post.nickname}</p>
                    <p className="text-sm opacity-90">{post.message}</p>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* QR Footer */}
          {qr && (
            <footer className="absolute bottom-4 left-4">
              <img src={qr} alt="QR" className="w-32 h-32 rounded-lg shadow-lg" />
              <p className="text-xs text-center mt-1 opacity-75">Scan to Join</p>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}
