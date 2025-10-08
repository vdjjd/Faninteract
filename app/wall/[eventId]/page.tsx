'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Submission {
  id: string;
  event_id: string;
  user_id: string;
  nickname: string;
  message: string;
  photo_url: string | null;
  status: string;
  created_at: string;
}

export default function FanWallPage() {
  const { eventId } = useParams();
  const [posts, setPosts] = useState<Submission[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load event + posts
  useEffect(() => {
    if (!eventId) return;

    async function fetchData() {
      // Get event info
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      setEvent(eventData);

      // Get approved posts
      const { data: submissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      setPosts(submissions || []);
      setLoading(false);
    }

    fetchData();

    // ✅ Live updates: new approved submissions
    const channel = supabase
      .channel('realtime:submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
        },
        (payload) => {
          const newPost = payload.new as Submission;
          if (newPost.event_id === eventId && newPost.status === 'approved') {
            setPosts((prev): Submission[] => [newPost, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading Fan Wall...</p>;
  if (!event) return <p style={{ color: '#fff', textAlign: 'center' }}>Event not found.</p>;

  return (
    <div
      style={{
        ...pageStyle,
        background: event.background_url
          ? `url(${event.background_url}) center/cover no-repeat`
          : 'linear-gradient(180deg, #000, #111)',
      }}
    >
      <div style={overlayStyle}>
        <h1 style={titleStyle}>{event.title}</h1>
        <div style={gridStyle}>
          {posts.length === 0 && <p>No posts yet. Be the first to join in!</p>}
          {posts.map((post) => (
            <div key={post.id} style={cardStyle}>
              {post.photo_url && (
                <img
                  src={post.photo_url}
                  alt={post.nickname}
                  style={{ width: '100%', borderRadius: '10px', marginBottom: '8px' }}
                />
              )}
              <p style={{ fontWeight: 600 }}>{post.nickname}</p>
              <p>{post.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- STYLES ----------------
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'white',
  overflow: 'hidden',
};

const overlayStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.6)',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  marginBottom: '20px',
  textAlign: 'center',
  color: '#1e90ff',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '20px',
  width: '100%',
  maxWidth: '1200px',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  padding: '10px',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(6px)',
};
