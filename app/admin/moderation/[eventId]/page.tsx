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
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  async function loadAll() {
    if (!eventId) return;
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) return console.error('❌ Error fetching:', error);
    setSubs((data as Submission[]) || []);
    setLoading(false);
  }

  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id);
    if (!error)
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'approved' } : s))
      );
  }

  async function handleReject(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (!error)
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'rejected' } : s))
      );
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (!error) setSubs((prev) => prev.filter((s) => s.id !== id));
  }

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
          if (payload.eventType === 'INSERT' && newData)
            setSubs((prev) => [newData, ...prev]);
          if (payload.eventType === 'UPDATE' && newData)
            setSubs((prev) =>
              prev.map((s) => (s.id === newData.id ? newData : s))
            );
          if (payload.eventType === 'DELETE' && newData)
            setSubs((prev) => prev.filter((s) => s.id !== newData.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

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
      <div style={{ textAlign: 'center', marginBottom: 25 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
          Moderation Page
        </h1>
        <button
          onClick={() => window.close()}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          ✖ Close
        </button>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 25,
            fontSize: 16,
          }}
        >
          <span>🕓 Pending: {pending.length}</span>
          <span>✅ Approved: {approved.length}</span>
          <span>🚫 Rejected: {rejected.length}</span>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          <Section
            title="Pending"
            color="#ffd966"
            data={pending}
            onApprove={handleApprove}
            onReject={handleReject}
            showDelete={false}
            onImageClick={setSelectedImg}
          />
          <Section
            title="Approved"
            color="#00ff88"
            data={approved}
            onDelete={handleDelete}
            showDelete
            onImageClick={setSelectedImg}
          />
          <Section
            title="Rejected"
            color="#ff4444"
            data={rejected}
            onDelete={handleDelete}
            showDelete
            onImageClick={setSelectedImg}
          />
        </div>
      )}

      {/* IMAGE POPUP */}
      {selectedImg && (
        <div
          onClick={() => setSelectedImg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImg}
              alt="preview"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 8,
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
              }}
            />
            <button
              onClick={() => setSelectedImg(null)}
              style={{
                position: 'absolute',
                top: -35,
                right: 0,
                background: '#da3633',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              ✖ Close
            </button>
          </div>
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
  onImageClick,
}: {
  title: string;
  color: string;
  data: Submission[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
  onImageClick?: (url: string) => void;
}) {
  return (
    <div>
      <h2
        style={{
          marginBottom: 12,
          borderLeft: `5px solid ${color}`,
          paddingLeft: 10,
          fontWeight: 600,
          fontSize: 18,
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {data.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                background: '#0b0f19',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #333',
                height: 120,
                boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              }}
            >
              {/* Left: Image */}
              <div
                style={{
                  flex: '0 0 45%',
                  cursor: s.photo_url ? 'pointer' : 'default',
                }}
                onClick={() =>
                  s.photo_url && onImageClick && onImageClick(s.photo_url)
                }
              >
                {s.photo_url ? (
                  <img
                    src={s.photo_url}
                    alt="submission"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#777',
                      fontSize: 11,
                    }}
                  >
                    No Image
                  </div>
                )}
              </div>

              {/* Right: Info */}
              <div
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>
                    {s.nickname || 'Anonymous'}
                  </strong>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#ccc',
                      margin: '4px 0 8px',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {s.message || '(no message)'}
                  </p>
                </div>

                {!showDelete ? (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      onClick={() => onApprove?.(s.id)}
                      style={{
                        flex: 1,
                        background: '#238636',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 0',
                        fontSize: 12,
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
                        borderRadius: 4,
                        padding: '4px 0',
                        fontSize: 12,
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
                      borderRadius: 4,
                      padding: '4px 0',
                      fontSize: 12,
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
