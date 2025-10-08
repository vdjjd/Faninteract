'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import QRCode from 'qrcode.react';
import { BRAND_LOGO } from '@/lib/constants';

type Submission = {
  id: string;
  photo_url: string;
  message: string | null;
  nickname: string | null;
  created_at: string;
};

type Event = {
  id: string;
  title: string;
  status: string;
  theme_colors: string | null;
  background_url: string | null;
  countdown: string | null;
  transition: string | null;
};

export default function LiveWall() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [posts, setPosts] = useState<Submission[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Load event + posts
  useEffect(() => {
    async function fetchEventAndPosts() {
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!ev) return;
      setEvent(ev);

      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      setPosts(subs || []);
      setLoading(false);
    }

    fetchEventAndPosts();

    // Realtime listener for new approved posts
    const channel = supabase
      .channel('wall-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          if (
  (payload.new as any)?.status === 'approved' &&
  (payload.new as any)?.event_id === eventId
) {
  const newPost = payload.new as Submission;
  setPosts((prev): Submission[] => [newPost, ...prev]);
  }
 }
)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // ✅ Rotation logic
  useEffect(() => {
    if (posts.length === 0) return;
    const speedMap: any = { fast: 10000, medium: 15000, slow: 30000 };
    const delay = speedMap[event?.transition || 'medium'];

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % posts.length);
    }, delay);

    return () => clearInterval(timer);
  }, [posts, event]);

  if (loading)
    return <div style={loadingStyle}>Loading Fan Zone Wall...</div>;

  if (!event)
    return <div style={loadingStyle}>No event found.</div>;

  // 🧮 Compute theme + layout
  const bg = event.background_url
    ? `url(${event.background_url}) center/cover no-repeat`
    : event.theme_colors
    ? `linear-gradient(135deg, ${event.theme_colors}, #000)`
    : '#000';

  const post = posts[index];

  return (
    <div style={{ ...wallStyle, background: bg }}>
      {/* Header */}
      <header style={headerStyle}>
        <img src={BRAND_LOGO} alt="FanInteract Logo" style={{ height: 60 }} />
        <h1 style={{ marginLeft: 10 }}>{event.title}</h1>
      </header>

      {/* Inactive or Live View */}
      {event.status !== 'live' ? (
        <div style={inactiveStyle}>
          <h2>Fan Zone Wall Going Live Shortly</h2>
          {event.countdown && <h3>{event.countdown}</h3>}
          <QRCode
            value={`${window.location.origin}/submit?event_id=${eventId}`}
            size={150}
            bgColor="transparent"
            fgColor="#fff"
            style={{ marginTop: 30 }}
          />
        </div>
      ) : posts.length === 0 ? (
        <div style={inactiveStyle}>
          <h2>No posts yet — scan and join!</h2>
          <QRCode
            value={`${window.location.origin}/submit?event_id=${eventId}`}
            size={150}
            bgColor="transparent"
            fgColor="#fff"
            style={{ marginTop: 30 }}
          />
        </div>
      ) : (
        <div style={postContainer}>
          <img
            src={post.photo_url}
            alt="Fan Submission"
            style={{
              width: 'auto',
              height: '65vh',
              borderRadius: 20,
              boxShadow: '0 0 20px rgba(0,0,0,0.6)',
            }}
          />
          <p style={commentText}>
            <strong>{post.nickname || 'Anonymous'}:</strong> {post.message}
          </p>

          {/* QR Bottom Left */}
          <div style={qrContainer}>
            <QRCode
              value={`${window.location.origin}/submit?event_id=${eventId}`}
              size={100}
              bgColor="transparent"
              fgColor="#fff"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- STYLES ----------------
const wallStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
};

const loadingStyle: React.CSSProperties = {
  ...wallStyle,
  background: '#000',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: 24,
};

const inactiveStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#fff',
};

const postContainer: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
};

const commentText: React.CSSProperties = {
  fontSize: 24,
  background: 'rgba(0,0,0,0.5)',
  padding: '10px 20px',
  borderRadius: 10,
  marginTop: 10,
};

const qrContainer: React.CSSProperties = {
  position: 'absolute',
  bottom: 20,
  left: 20,
};

const headerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};
