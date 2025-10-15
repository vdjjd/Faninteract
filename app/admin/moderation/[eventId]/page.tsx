'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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

  // 🚀 Load all submissions for this event
  async function loadAll() {
    if (!eventId) return;
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching submissions:', error);
      return;
    }

    setSubs((data as Submission[]) || []);
    setLoading(false);
  }

  // ✅ Approve
  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id);
    if (!error) {
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'approved' } : s))
      );
    }
  }

  // 🚫 Reject
  async function handleReject(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (!error) {
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'rejected' } : s))
      );
    }
  }

  // 🗑️ Delete
  async function handleDelete(id: string) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (!error) setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  // 🔁 Realtime listener
  useEffect(() => {
    if (!eventId) return;
    loadAll();

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
        (payload: any) => {
          const newData = payload?.new as Submission | undefined;

          if (payload.eventType === 'INSERT' && newData) {
            setSubs((prev) => [newData, ...prev]);
          }

          if (payload.eventType === 'UPDATE' && newData) {
            setSubs((prev) =>
              prev.map((s) => (s.id === newData.id ? newData : s))
            );
          }

          if (payload.eventType === 'DELETE' && newData) {
            setSubs((prev) => prev.filter((s) => s.id !== newData.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // 🧮 Counters
  const pending = subs.filter((s) => s.status === 'pending');
  const approved = subs.filter((s) => s.status === 'approved');
  const rejected = subs.filter((s) => s.status === 'rejected');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #4dc6ff, #001f4d)',
        padding: '30px 20px',
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 30,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            marginBottom: 10,
            fontWeight: '600',
          }}
        >
          Moderation Page
        </h1>

        {/* CLOSE BUTTON */}
        <button
          onClick={() => window.close()}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          ✖ Close
        </button>

        {/* COUNTERS */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 25,
            fontSize: 18,
          }}
        >
          <span>🕓 Pending: {pending.length}</span>
          <span>✅ Approved: {approved.length}</span>
          <span>🚫 Rejected: {rejected.length}</span>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading submissions...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {/* PENDING */}
          <Section
            title="Pending Submissions"
            color="#ffd966"
            data={pending}
            onApprove={handleApprove}
            onReject={handleReject}
            showDelete={false}
          />

          {/* APPROVED */}
          <Section
            title="Approved Posts"
            color="#00ff88"
            data={approved}
            onDelete={handleDelete}
            showDelete={true}
          />

          {/* REJECTED */}
          <Section
            title="Rejected Posts"
            color="#ff4444"
            data={rejected}
            onDelete={handleDelete}
            showDelete={true}
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------
   SECTION COMPONENT
------------------------------------------- */
function Section({
  title,
  color,
  data,
  onApprove,
  onReject,
  onDelete,
  showDelete,
}: {
  title: string;
  color: string;
  data: Submission[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}) {
  return (
    <div>
      <h2
        style={{
          marginBottom: 16,
          borderLeft: `5px solid ${color}`,
          paddingLeft: 10,
          fontWeight: '600',
          fontSize: 20,
        }}
      >
        {title} ({data.length})
      </h2>

      {data.length === 0 ? (
        <p style={{ color: '#ccc', marginLeft: 10 }}>None in this section.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {data.map((s) => (
            <div
              key={s.id}
              style={{
                background: '#111',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                height: 300,
              }}
            >
              {s.photo_url && (
                <img
                  src={s.photo_url}
                  alt="submission"
                  style={{
                    width: '100%',
                    height: 180,
                    objectFit: 'cover',
                  }}
                />
              )}
              <div style={{ padding: 10, flex: 1 }}>
                <strong>{s.nickname || 'Anonymous'}</strong>
                <p
                  style={{
                    fontSize: 13,
                    margin: '6px 0 12px',
                    color: '#ccc',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineClamp: 2,
                  }}
                >
                  {s.message || '(no message)'}
                </p>

                {/* BUTTONS */}
                {!showDelete ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 'auto',
                    }}
                  >
                    <button
                      onClick={() => onApprove?.(s.id)}
                      style={{
                        flex: 1,
                        background: '#238636',
                        color: 'white',
                        border: 'none',
                        borderRadius: 5,
                        padding: '6px 0',
                        cursor: 'pointer',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject?.(s.id)}
                      style={{
                        flex: 1,
                        background: '#da3633',
                        color: 'white',
                        border: 'none',
                        borderRadius: 5,
                        padding: '6px 0',
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onDelete?.(s.id)}
                    style={{
                      width: '100%',
                      background: '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 5,
                      padding: '6px 0',
                      cursor: 'pointer',
                    }}
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
