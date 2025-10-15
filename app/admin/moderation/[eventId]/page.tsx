'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ModerationPage() {
  const { eventId } = useParams();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch pending submissions
  async function fetchSubs() {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading submissions:', error);
      return;
    }
    setSubmissions(data || []);
    setLoading(false);
  }

  // ✅ Approve submission
  async function approvePost(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      console.error('❌ Error approving post:', error);
      return;
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    await supabase.from('events').update({}).eq('id', eventId); // triggers real-time sync
  }

  // 🚫 Reject submission
  async function rejectPost(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      console.error('❌ Error rejecting post:', error);
      return;
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    await supabase.from('events').update({}).eq('id', eventId);
  }

  // 🔁 Real-time updates
  useEffect(() => {
    fetchSubs();

    const channel = supabase
      .channel('submissions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('🔄 Realtime update:', payload);

          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            setSubmissions((prev) => [payload.new, ...prev]);
          }

          if (
            (payload.eventType === 'UPDATE' &&
              payload.new.status !== 'pending') ||
            payload.eventType === 'DELETE'
          ) {
            setSubmissions((prev) =>
              prev.filter((s) => s.id !== payload.new.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // 🧩 Render
  return (
    <div style={{ padding: 24, background: '#0d1117', minHeight: '100vh', color: 'white' }}>
      <h2 style={{ marginBottom: 20 }}>Pending Submissions</h2>
      {loading ? (
        <p>Loading...</p>
      ) : submissions.length === 0 ? (
        <p>No pending posts right now.</p>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {submissions.map((sub) => (
            <div
              key={sub.id}
              style={{
                background: '#161b22',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #30363d',
              }}
            >
              {sub.image_url && (
                <img
                  src={sub.image_url}
                  alt="submission"
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    marginBottom: 12,
                    objectFit: 'cover',
                  }}
                />
              )}
              <p style={{ marginBottom: 10 }}>{sub.text || '(no text)'}</p>
              <div style={{ display: 'flex', gap: 10 }}>
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
                  Approve
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
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
