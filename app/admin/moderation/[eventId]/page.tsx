'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ModerationPage() {
  const { eventId } = useParams();
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch all submissions grouped by status
  async function fetchSubs() {
    console.log('🧠 Fetching submissions for', eventId);
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', String(eventId))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading submissions:', error.message);
      return;
    }
    console.log('📦 Result:', data);

    setPending(data?.filter((s) => s.status === 'pending') || []);
    setApproved(data?.filter((s) => s.status === 'approved') || []);
    setRejected(data?.filter((s) => s.status === 'rejected') || []);
    setLoading(false);
  }

  // 🔁 Real-time updates (no filter yet for debugging)
  useEffect(() => {
    fetchSubs();

    const ch = supabase
      .channel('submissions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => fetchSubs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // ✅ Approve post
  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', id);
    if (error) console.error('❌ Approve error:', error.message);
    else fetchSubs();
  }

  // ❌ Reject post
  async function handleReject(id: string) {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) console.error('❌ Reject error:', error.message);
    else fetchSubs();
  }

  // 🗑 Delete permanently (optional)
  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);
    if (error) console.error('❌ Delete error:', error.message);
    else fetchSubs();
  }

  function handleClose() {
    window.close();
  }

  if (loading)
    return <p style={{ color: '#fff', textAlign: 'center' }}>Loading moderation queue…</p>;

  /* ---------- RENDER ---------- */
  return (
    <div style={pageStyle}>
      <img src="/faninteractlogo.png" alt="FanInteract Logo" style={{ width: 160, marginBottom: 10 }} />
      <button style={closeBtn} onClick={handleClose}>✖ Close Moderation</button>

      <h2 style={sectionHeader}>🟡 Pending Submissions ({pending.length})</h2>
      <div style={gridStyle}>
        {pending.length === 0 && <p style={emptyText}>No pending posts.</p>}
        {pending.map((s) => (
          <div key={s.id} style={cardStyle}>
            <img src={s.photo_url} alt="" style={imgStyle} />
            <div style={textBlock}>
              <p style={name}>{s.nickname}</p>
              <p style={msg}>{s.message}</p>
            </div>
            <div style={btnRow}>
              <button style={approveBtn} onClick={() => handleApprove(s.id)}>✅ Approve</button>
              <button style={denyBtn} onClick={() => handleReject(s.id)}>❌ Reject</button>
            </div>
          </div>
        ))}
      </div>

      <h2 style={sectionHeader}>🟢 Approved ({approved.length})</h2>
      <div style={gridStyle}>
        {approved.length === 0 && <p style={emptyText}>No approved posts yet.</p>}
        {approved.map((s) => (
          <div key={s.id} style={{ ...cardStyle, border: '2px solid #16a34a' }}>
            <img src={s.photo_url} alt="" style={imgStyle} />
            <div style={textBlock}>
              <p style={name}>{s.nickname}</p>
              <p style={msg}>{s.message}</p>
            </div>
            <button style={deleteBtn} onClick={() => handleDelete(s.id)}>🗑 Delete</button>
          </div>
        ))}
      </div>

      <h2 style={sectionHeader}>🔴 Rejected ({rejected.length})</h2>
      <div style={gridStyle}>
        {rejected.length === 0 && <p style={emptyText}>No rejected posts.</p>}
        {rejected.map((s) => (
          <div key={s.id} style={{ ...cardStyle, border: '2px solid #a33' }}>
            <img src={s.photo_url} alt="" style={imgStyle} />
            <div style={textBlock}>
              <p style={name}>{s.nickname}</p>
              <p style={msg}>{s.message}</p>
            </div>
            <button style={deleteBtn} onClick={() => handleDelete(s.id)}>🗑 Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'linear-gradient(180deg,#0d0d0d,#1a1a1a)',
  color: '#fff',
  minHeight: '100vh',
  padding: '25px 20px',
  fontFamily: 'system-ui,sans-serif',
};

const sectionHeader: React.CSSProperties = {
  marginTop: 20,
  marginBottom: 10,
  fontSize: 18,
};

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 15,
  justifyContent: 'center',
  marginBottom: 30,
};

const cardStyle: React.CSSProperties = {
  background: '#222',
  borderRadius: 10,
  width: 200,
  height: 400,
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: '0 0 10px rgba(0,0,0,0.5)',
};

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: 200,
  objectFit: 'cover',
  borderRadius: 8,
};

const textBlock: React.CSSProperties = {
  textAlign: 'center',
};

const name: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
  color: '#4fc3f7',
  marginTop: 6,
  marginBottom: 4,
};

const msg: React.CSSProperties = {
  fontSize: 13,
  color: '#ddd',
  lineHeight: 1.2,
};

const btnRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  marginTop: 8,
};

const approveBtn: React.CSSProperties = {
  flex: 1,
  background: '#16a34a',
  border: 'none',
  borderRadius: 6,
  padding: '6px 8px',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  marginRight: 5,
};

const denyBtn: React.CSSProperties = {
  flex: 1,
  background: '#a33',
  border: 'none',
  borderRadius: 6,
  padding: '6px 8px',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const deleteBtn: React.CSSProperties = {
  width: '100%',
  background: '#a33',
  border: 'none',
  borderRadius: 6,
  padding: '6px 8px',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8,
};

const emptyText: React.CSSProperties = {
  color: '#888',
  textAlign: 'center',
  width: '100%',
};

const closeBtn: React.CSSProperties = {
  backgroundColor: '#1e90ff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 20px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  marginBottom: 20,
};
