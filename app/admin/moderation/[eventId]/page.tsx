'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Submission {
  id: string;
  event_id: string;
  text?: string;
  image_url?: string;
  status: string;
  created_at?: string;
}

export default function ModerationPage() {
  const { eventId } = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch pending posts
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

    setSubmissions((data as Submission[]) || []);
    setLoading(false);
  }

  // ✅ Approve
  async function approvePost(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id);
    if (error) return console.error('approve error:', error);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  // 🚫 Reject
  async function rejectPost(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) return console.error('reject error:', error);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  // 🔁 Real-time updates
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
          const newData = payload.new as Submission | undefined;

          if (payload.eventType === 'INSERT' && newData?.status === 'pending') {
            setSubmissions((prev) => [newData, ...prev]);
          }

          if (
            payload.eventType === 'UPDATE' &&
            newData?.status !== 'pending'
          ) {
            setSubmissions((prev) =>
              prev.filter((s) => s.id !== newData.id)
            );
          }
        }
      )
      .subscribe();

    // 🧩 Fix: make cleanup synchronous (not async)
    return () => {
      supabase.removeChannel(channel); // don't return the Promise
    };
  }, [eventId]);

  // 🧩 Render
  return (
    <div style={{ padding: 20 }}>
      <h2>Pending Submissions</h2>

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
                background: '#222',
                padding: 12,
                borderRadius: 8,
                color: 'white',
              }}
            >
              {sub.image_url && (
                <img
                  src={sub.image_url}
                  alt="submission"
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    marginBottom: 8,
                    objectFit: 'cover',
                  }}
                />
              )}
              <p>{sub.text || '(no text)'}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => approvePost(sub.id)}>Approve</button>
                <button onClick={() => rejectPost(sub.id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
