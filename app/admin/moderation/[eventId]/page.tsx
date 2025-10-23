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
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null);

  const isPopup = typeof window !== 'undefined' && !!window.opener;

  function showToast(text: string, color = '#00ff88') {
    setToast({ text, color });
    setTimeout(() => setToast(null), 2500);
  }

  async function loadAll() {
    if (!eventId) return;
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (!error && data) setSubs(data);
    else console.error('❌ Error fetching submissions:', error);
    setLoading(false);
  }

  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single();
    if (error) console.error(error);
    else {
      showToast('✅ Post Approved');
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'approved' } : s)));
    }
  }

  async function handleReject(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();
    if (error) console.error(error);
    else {
      showToast('🚫 Post Rejected', '#ff4444');
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'rejected' } : s)));
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) {
      showToast('❌ Delete failed', '#ff4444');
      console.error(error);
    } else {
      showToast('🧹 Post Deleted', '#bbb');
      setSubs((prev) => prev.filter((s) => s.id !== id));
    }
  }

  useEffect(() => {
    if (!eventId) return;
    loadAll();

    const channel = supabase
      .channel(`moderation_${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          const newData = payload?.new as Submission | undefined;
          if (payload.eventType === 'INSERT' && newData) setSubs((p) => [newData, ...p]);
          if (payload.eventType === 'UPDATE' && newData)
            setSubs((p) => p.map((s) => (s.id === newData.id ? newData : s)));
          if (payload.eventType === 'DELETE' && newData)
            setSubs((p) => p.filter((s) => s.id !== newData.id));
        }
      )
      .subscribe();

    // ✅ Fixed cleanup (non-async)
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  const pending = subs.filter((s) => s.status === 'pending');
  const approved = subs.filter((s) => s.status === 'approved');
  const rejected = subs.filter((s) => s.status === 'rejected');

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        maxWidth: isPopup ? '1280px' : '100%',
        overflowY: 'auto',
        margin: '0 auto',
        background: 'linear-gradient(to bottom right,#4dc6ff,#001f4d)',
        padding: isPopup ? '12px 18px' : '30px 20px',
        fontFamily: 'Inter,sans-serif',
        color: '#fff',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Moderation</h1>
        {isPopup && (
          <button
            onClick={() => window.close()}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              padding: '5px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ✖ Close
          </button>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            fontSize: 14,
            marginTop: 8,
          }}
        >
          <span>🕓 {pending.length} Pending</span>
          <span>✅ {approved.length} Approved</span>
          <span>🚫 {rejected.length} Rejected</span>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Section
            title="Pending"
            color="#ffd966"
            data={pending}
            onApprove={handleApprove}
            onReject={handleReject}
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

      {selectedImg && (
        <div
          onClick={() => setSelectedImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
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
                top: -32,
                right: 0,
                background: '#da3633',
                border: 'none',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              ✖
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.color,
            color: '#000',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.4s ease, fadeOut 0.4s ease 2.3s forwards',
            zIndex: 99999,
          }}
        >
          {toast.text}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 40px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes fadeOut {
          to { opacity: 0; transform: translate(-50%, 40px); }
        }
      `}</style>
    </div>
  );
}

/* ---------- SECTION COMPONENT ---------- */
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
          marginBottom: 8,
          borderLeft: `4px solid ${color}`,
          paddingLeft: 8,
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        {title} ({data.length})
      </h2>

      {data.length === 0 ? (
        <p style={{ color: '#ccc', marginLeft: 10, fontSize: 13 }}>None in this section.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
            gap: 8,
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
                height: 110,
              }}
            >
              <div
                style={{
                  flex: '0 0 45%',
                  cursor: s.photo_url ? 'pointer' : 'default',
                }}
                onClick={() => s.photo_url && onImageClick?.(s.photo_url!)}
              >
                {s.photo_url ? (
                  <img
                    src={s.photo_url}
                    alt="submission"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#333',
                      color: '#777',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                  >
                    No Image
                  </div>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '6px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong style={{ fontSize: 12 }}>{s.nickname || 'Anonymous'}</strong>
                  <p
                    style={{
                      fontSize: 11,
                      color: '#ccc',
                      margin: '3px 0 6px',
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
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => onApprove?.(s.id)}
                      style={{
                        flex: 1,
                        background: '#238636',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 0',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => onReject?.(s.id)}
                      style={{
                        flex: 1,
                        background: '#da3633',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 0',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      🚫
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
                      padding: '3px 0',
                      fontSize: 11,
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