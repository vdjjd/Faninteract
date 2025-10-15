'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Define what a submission looks like based on your actual table
interface Submission {
  id: string;
  event_id: string;
  user_id?: string;
  photo_url?: string;
  message?: string;
  nickname?: string;
  status: string;
  created_at?: string;
  reviewed?: boolean;
}

export default function ModerationPage() {
  const { eventId } = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch all pending submissions for the event
  async function fetchPending() {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching pending posts:', error);
      return;
    }

    console.log('✅ Fetched pending:', data);
    setSubmissions((data as Submission[]) || []);
    setLoading(false);
  }

  // ✅ Approve post
  async function approvePost(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved', reviewed: true })
      .eq('id', id);

    if (error) {
      console.error('❌ Error approving post:', error);
      return;
    }

    // Instantly remove from the local list
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  // 🚫 Reject post
  async function rejectPost(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected', reviewed: true })
      .eq('id', id);

    if (error) {
      console.error('❌ Error rejecting post:', error);
      return;
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  // 🔁 Realtime updates for new pending submissions
  useEffect(() => {
    fetchPending();

    const channel = supabase
      .channel('moderation_live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `event_id=eq.${eventId}`,
        },
        (payload: any) => {
          console.log('📡 Realtime payload:', payload);

          const newData: Submission | undefined = payload?.new;

          // New pending submission
          if (payload.eventType === 'INSERT' && newData?.status === 'pending') {
            setSubmissions((prev) => [newData, ...prev]);
          }

          // If status changes away from pending, remove it
          if (
            payload.eventType === 'UPDATE' &&
            newData &&
            newData.status !== 'pending'
          ) {
            setSubmissions((prev) =>
              prev.filter((s) => s.id !== (newData?.id ?? ''))
            );
          }
        }
      )
      .subscribe();

    // Cleanup (must not return async promise)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // 🧩 Render
  return (
    <div style={{ padding: 20, background: '#0d1117', minHeight: '100vh', color: 'white' }}>
      <h2 style={{ marginBottom: 20 }}>Pending Submissions</h2>

      {loading ? (
        <p>Loading...</p>
      ) : submissions.length === 0 ? (
        <p>No pending posts right now.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {submissions.map((sub) => (
            <div
              key={sub.id}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                padding: 16,
                borderRadius: 8,
              }}
            >
              {sub.photo_url && (
                <img
                  src={sub.photo_url}
                  alt="submission"
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    marginBottom: 8,
                    objectFit: 'cover',
                  }}
                />
              )}

              <p>
                <strong>{sub.nickname || 'Anonymous'}:</strong>{' '}
                {sub.message || '(no message)'}
              </p>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => approvePost(sub.id)}
                  style={{
                    background: '#238636',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => rejectPost(sub.id)}
                  style={{
                    background: '#da3633',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  🚫 Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
