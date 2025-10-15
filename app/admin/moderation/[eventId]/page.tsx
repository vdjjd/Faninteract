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

  // 🔹 Fetch submissions grouped by status
  async function fetchSubs() {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading submissions:', error.message);
      return;
    }

    setPending(data.filter((s) => s.status === 'pending'));
    setApproved(data.filter((s) => s.status === 'approved'));
    setRejected(data.filter((s) => s.status === 'rejected'));
    setLoading(false);
  }

  // 🔁 Real-time listener
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

  // ✅ Approve
  async function handleApprove(id: string) {
    await supabase.from('submissions').update({ status: 'approved' }).eq('id', id);
    fetchSubs();
  }

  // ❌ Reject
  async function handleReject(id: string) {
    await supabase.from('submissions').update({ status: 'rejected' }).eq('id', id);
    fetchSubs();
  }

  // 🗑 Delete permanently
  async function handleDelete(id: string) {
    await supabase.from('submissions').delete().eq('id', id);
    fetchSubs();
  }

  function handleClose() {
    window.close();
  }

  if (loading)
    return <p style={{ color: '#fff', textAlign: 'center' }}>Loading moderation queue…</p>;

  return (
    <div style={pageStyle}>
      <img src="/faninteractlogo.png" alt="FanInteract Logo" style={{ width: 160, marginBottom: 10 }} />

      {/* 🔸 Summary Counts */}
      <div style={summaryBar}>
        <span style={{ color: '#ffaa00' }}>🟡 Pending: {pending.length}</span>
        <span style={{ color: '#16a34a' }}>🟢 Approved: {approved.length}</span>
        <span style={{ color: '#a33' }}>🔴 Rejected: {rejected.length}</span>
      </div>

      <button style={closeBtn} onClick={handleClose}>✖ Close Moderation</button>

      {/* 🟡 Pending */}
      <Section title="🟡 Pending Submissions" color="#ffaa00">
        {pending.length === 0 && <EmptyText>No pending posts.</EmptyText>}
        {pending.map((s) => (
          <Card key={s.id} border="#ffaa00">
            <CardContent s={s} />
            <div style={buttonRow}>
              <button style={approveBtn} onClick={() => handleApprove(s.id)}>✅ Approve</button>
              <button style={denyBtn} onClick={() => handleReject(s.id)}>❌ Reject</button>
            </div>
          </Card>
        ))}
      </Section>

      {/* 🟢 Approved */}
      <Section title="🟢 Approved Posts" color="#16a34a">
        {approved.length === 0 && <EmptyText>No approved posts.</EmptyText>}
        {approved.map((s) => (
          <Card key={s.id} border="#16a34a">
            <CardContent s={s} />
            <div style={buttonRow}>
              <button style={deleteBtn} onClick={() => handleDelete(s.id)}>🗑 Delete</button>
            </div>
          </Card>
        ))}
      </Section>

      {/* 🔴 Rejected */}
      <Section title="🔴 Rejected Posts" color="#a33">
        {rejected.length === 0 && <EmptyText>No rejected posts.</EmptyText>}
        {rejected.map((s) => (
          <Card key={s.id} border="#a33">
            <CardContent s={s} />
            <div style={buttonRow}>
              <button style={deleteBtn} onClick={() => handleDelete(s.id)}>🗑 Delete</button>
            </div>
          </Card>
        ))}
      </Section>
    </div>
  );
}

/* ---------- Helper Components ---------- */

function Section({ title, color, children }: any) {
  return (
    <div style={{ width: '100%', maxWidth: 1200, marginBottom: 40 }}>
      <h2 style={{ color, textAlign: 'left', marginBottom: 10 }}>{title}</h2>
      <div style={gridStyle}>{children}</div>
    </div>
  );
}

function EmptyText({ children }: any) {
  return <p style={{ color: '#999', textAlign: 'center', width: '100%' }}>{children}</p>;
}

function Card({ border, children }: any) {
  return <div style={{ ...cardStyle, border: `2px solid ${border}` }}>{children}</div>;
}

function CardContent({ s }: any) {
  return (
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
          {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

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

const summaryBar: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 30,
  marginBottom: 20,
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: 0.3,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: 20,
  width: '100%',
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

const timestampStyle: React.CSSProperties = { fontSize: 12, color: '#999' };

const buttonRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 10,
};

const approveBtn = {
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

const denyBtn = {
  flex: 1,
  background: '#a33',
  border: 'none',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
};

const deleteBtn = {
  flex: 1,
  background: '#555',
  border: 'none',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
};

const closeBtn = {
  backgroundColor: '#1e90ff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 25px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  marginBottom: 20,
};
