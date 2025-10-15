'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Define the shape of the data (matches your table exactly)
interface Submission {
  id: string;
  event_id: string;
  nickname?: string;
  message?: string;
  photo_url?: string;
  status: string;
  created_at?: string;
}

export default function ModerationPage() {
  const { eventId } = useParams();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch all pending submissions
  async function loadPending() {
    if (!eventId) return;
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching submissions:', error);
      return;
    }

    setSubs(data || []);
    setLoading(false);
  }

  // ✅ Approve a post
  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      console.error('❌ Error approving post:', error);
      return;
    }

    // Instantly remove it from local state
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  // 🚫 Reject a post
  async function handleReject(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      console.error('❌ Error rejecting post:', error);
      return;
    }

    // Instantly remove from local state
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  // 🔁 Realtime listener
  useEffect(() => {
    if (!eventId) return;

    loadPending();

    const channel = supabase
      .channel(`moderation_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newData = payload.new;

          // When a new submission is inserted and still pending
          if (payload.eventType === 'INSERT' && newData?.status === 'pending') {
            setSubs((prev) => [newData, ...prev]);
          }

          // When a pending submission gets updated (approved/rejected)
          if (
            payload.eventType === 'UPDATE' &&
            newData?.status !== 'pending'
          ) {
            setSubs((prev) => prev.filter((s) => s.id !== newData?.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // 🧩 UI
  return (
    <div
      style={{
        background: '#0d1117',
        color: '#fff',
        minHeight: '100vh',
        padding: '30px 20px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>
        Moderation Panel
      </h1>
      <p style={{ color: '#8b949e', marginBottom: 30 }}>
        Event ID: {eventId}
      </p>

      {loading ? (
        <p>Loading submissions...</p>
      ) : subs.length === 0 ? (
        <p style={{ color: '#8b949e' }}>No pending posts found.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          }}
        >
          {subs.map((s) => (
            <div
              key={s.id}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {s.photo_url && (
                <img
                  src={s.photo_url}
                  alt="submission"
                  style={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                    borderBottom: '1px solid #30363d',
                  }}
                />
              )}

              <div style={{ padding: 16, flex: 1 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>
                  {s.nickname || 'Anonymous'}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: '#c9d1d9',
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {s.message || '(no message)'}
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleApprove(s.id)}
                    style={{
                      flex: 1,
                      background: '#238636',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 0',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleReject(s.id)}
                    style={{
                      flex: 1,
                      background: '#da3633',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 0',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    🚫 Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
