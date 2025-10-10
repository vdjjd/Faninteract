'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ModerationPage() {
  const { eventId } = useParams();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch submissions
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
    setSubmissions(data || []);
    setLoading(false);
  }

  // 🔁 Real-time updates
  useEffect(() => {
    fetchSubs();
    const ch = supabase
      .channel('realtime:submissions')
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

  // ✅ Approve / Reject
  async function handleModeration(id: string, action: 'approved' | 'rejected') {
    const { error } = await supabase.rpc('update_submission_status', {
      submission_id: id,
      new_status: action,
    });
    if (error) console.error('❌ Moderation error:', error.message);
    else await fetchSubs();
  }

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading queue…</p>;

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 10 }}>🛡️ Moderation Panel</h1>
      <p style={{ marginBottom: 30, color: '#ccc' }}>
        Review and approve posts for this Fan Zone wall.
      </p>

      <div style={gridStyle}>
        {submissions.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center' }}>No submissions yet.</p>
        )}

        {submissions.map((s) => (
          <div key={s.id} style={cardStyle}>
            <img
              src={s.photo_url}
              alt="User submission"
              style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }}
            />
            <p style={{ marginTop: 8 }}>
              <strong>{s.nickname || s.first_name || 'Guest'}</strong>
            </p>
            <p
              style={{
                fontSize: 14,
                color: '#ccc',
                minHeight: 40,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.message}
            </p>
            <p
              style={{
                fontSize: 13,
                color:
                  s.status === 'pending'
                    ? 'orange'
                    : s.status === 'approved'
                    ? 'lime'
                    : '#ff5555',
              }}
            >
              {s.status.toUpperCase()}
            </p>
            {s.status === 'pending' && (
              <div style={btnGroup}>
                <button style={approveBtn} onClick={() => handleModeration(s.id, 'approved')}>
                  ✅ Approve
                </button>
                <button style={rejectBtn} onClick={() => handleModeration(s.id, 'rejected')}>
                  ❌ Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0d0d0d, #1a1a1a)',
  color: '#fff',
  padding: '40px 20px',
  fontFamily: 'system-ui, sans-serif',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 20,
  width: '100%',
  maxWidth: 1200,
  margin: '0 auto',
};

const cardStyle: React.CSSProperties = {
  background: '#222',
  borderRadius: 10,
  padding: 10,
  textAlign: 'center',
  boxShadow: '0 0 8px rgba(0,0,0,0.4)',
};

const btnGroup: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  marginTop: 8,
};

const approveBtn: React.CSSProperties = {
  backgroundColor: '#16a34a',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#fff',
  cursor: 'pointer',
};

const rejectBtn: React.CSSProperties = {
  backgroundColor: '#a33',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#fff',
  cursor: 'pointer',
};
