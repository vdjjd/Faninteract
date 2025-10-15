'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ModerationPage() {
  const { eventId } = useParams();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch all pending + approved submissions
  async function fetchSubs() {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading submissions:', error.message);
      return;
    }
    setSubmissions(data || []);
    setLoading(false);
  }

  // 🔁 Real-time updates
  useEffect(() => {
    fetchSubs();
    const ch = supabase
      .channel(`submissions-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${eventId}` },
        () => fetchSubs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId]);

  // ✅ Approve post
  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) console.error('❌ Approve error:', error.message);
    else fetchSubs();
  }

  // ❌ Reject (delete)
  async function handleReject(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) console.error('❌ Reject error:', error.message);
    else fetchSubs();
  }

  // ✅ Close popup
  function handleClose() {
    window.close();
  }

  if (loading)
    return <p style={{ color: '#fff', textAlign: 'center' }}>Loading moderation queue…</p>;

  return (
    <div style={pageStyle}>
      <img src="/faninteractlogo.png" alt="FanInteract Logo" style={{ width: 160, marginBottom: 10 }} />
      <button style={closeBtn} onClick={handleClose}>✖ Close Moderation</button>
      <h2 style={{ marginTop: 10, marginBottom: 30 }}>🛡️ Pending & Approved Submissions</h2>

      <div style={gridStyle}>
        {submissions.length === 0 && (
          <p style={{ color: '#ccc', textAlign: 'center', width: '100%' }}>
            No submissions right now.
          </p>
        )}

        {submissions.map((s) => (
          <div
            key={s.id}
            style={{
              ...cardStyle,
              border:
                s.status === 'approved'
                  ? '2px solid #16a34a'
                  : '2px solid #ffaa00',
            }}
          >
            <div style={cardContent}>
              <img
                src={s.photo_url}
                alt="Submitted Photo"
                style={imageStyle}
                onClick={() => window.open(s.photo_url, '_blank')}
              />
              <div style={textSection}>
                <p style={messageStyle}>{s.message}</p>
                <p style={nicknameStyle}>{s.nickname || 'Guest'}</p>
                <p style={timestampStyle}>
                  {new Date(s.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div style={buttonRow}>
              {s.status === 'pending' ? (
                <>
                  <button style={approveBtn} onClick={() => handleApprove(s.id)}>
                    ✅ Approve
                  </button>
                  <button style={denyBtn} onClick={() => handleReject(s.id)}>
                    ❌ Reject
                  </button>
                </>
              ) : (
                <p style={{ color: '#16a34a', fontWeight: 600 }}>✅ Approved</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'linear-gradient(180deg, #0d0d0d, #1a1a1a)',
  color: '#fff',
  minHeight: '100vh',
  padding: '30px 20px',
  fontFamily: 'system-ui, sans-serif',
  overflowY: 'auto',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: 20,
  width: '100%',
  maxWidth: 1200,
};

const cardStyle: React.CSSProperties = {
  background: '#222',
  borderRadius: 12,
  padding: 15,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: '0 0 12px rgba(0,0,0,0.4)',
  transition: 'opacity 0.3s ease',
};

const cardContent: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
};

const imageStyle: React.CSSProperties = {
  width: 120,
  height: 120,
  objectFit: 'cover',
  borderRadius: 10,
  cursor: 'pointer',
};

const textSection: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const messageStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#fff',
  marginBottom: 6,
  wordBreak: 'break-word',
};

const nicknameStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#66ccff',
  fontWeight: 'bold',
  marginBottom: 4,
};

const timestampStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#999',
};

const buttonRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 10,
};

const approveBtn: React.CSSProperties = {
  flex: 1,
  background: '#16a34a',
  border: 'none',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  marginRight: 8,
};

const denyBtn: React.CSSProperties = {
  flex: 1,
  background: '#a33',
  border: 'none',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
};

const closeBtn: React.CSSProperties = {
  backgroundColor: '#1e90ff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 25px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  marginBottom: 20,
};
