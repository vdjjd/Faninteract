'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/* -------------------------------------------------------------------------- */
/* 📸 TYPES                                                                   */
/* -------------------------------------------------------------------------- */
interface GuestPost {
  id: string;
  fan_wall_id: string;
  nickname?: string;
  message?: string;
  photo_url?: string;
  status: string;
  created_at?: string;
}

/* -------------------------------------------------------------------------- */
/* 🧠 MAIN COMPONENT                                                          */
/* -------------------------------------------------------------------------- */
export default function ModerationPage() {
  const router = useRouter();
  const { wallId } = useParams();

  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null);

  const isPopup = typeof window !== 'undefined' && window.opener;

  /* ✅ Popup safety & redirect guard */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ❌ If opened accidentally in a wall tab or directly by URL → send back to dashboard
    const url = window.location.href;
    const openerUrl = window.opener?.location?.href;

    if (!isPopup || !openerUrl?.includes('/admin/dashboard')) {
      // Give a little time for devtools/manual loads so it doesn't freak
      setTimeout(() => {
        router.replace('/admin/dashboard');
      }, 50);
    }

    // ✅ If parent closes, close popup
    const checkParent = setInterval(() => {
      if (isPopup && window.opener && window.opener.closed) {
        window.close();
      }
    }, 1000);

    return () => clearInterval(checkParent);
  }, [isPopup, router]);

  /* ✅ Toast helper */
  function showToast(text: string, color = '#00ff88') {
    setToast({ text, color });
    setTimeout(() => setToast(null), 2500);
  }

  /* ✅ Load posts */
  async function loadAll() {
    if (!wallId) return;
    const { data, error } = await supabase
      .from('guest_posts')
      .select('*')
      .eq('fan_wall_id', wallId)
      .order('created_at', { ascending: false });

    if (!error) setPosts(data);
    setLoading(false);
  }

  /* ✅ Actions */
  async function handleApprove(id: string) {
    await supabase.from('guest_posts').update({ status: 'approved' }).eq('id', id);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)));
    showToast('✅ Approved');
  }

  async function handleReject(id: string) {
    await supabase.from('guest_posts').update({ status: 'rejected' }).eq('id', id);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)));
    showToast('🚫 Rejected', '#ff4444');
  }

  async function handleDelete(id: string) {
    await supabase.from('guest_posts').delete().eq('id', id);
    setPosts((p) => p.filter((x) => x.id !== id));
    showToast('🗑 Deleted', '#bbb');
  }

  /* ✅ Real-time sync */
  useEffect(() => {
    if (!wallId) return;
    loadAll();

    const channel = supabase
      .channel(`moderation_${wallId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_posts', filter: `fan_wall_id=eq.${wallId}` },
        (payload) => {
          const n = payload.new as GuestPost;
          if (payload.eventType === 'INSERT') setPosts((p) => [n, ...p]);
          if (payload.eventType === 'UPDATE') setPosts((p) => p.map((x) => (x.id === n.id ? n : x)));
          if (payload.eventType === 'DELETE') setPosts((p) => p.filter((x) => x.id !== n.id));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [wallId]);

  const pending = posts.filter((x) => x.status === 'pending');
  const approved = posts.filter((x) => x.status === 'approved');
  const rejected = posts.filter((x) => x.status === 'rejected');

  /* ✅ UI */
  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        maxWidth: '1280px',
        background: 'linear-gradient(to bottom right,#4dc6ff,#001f4d)',
        padding: '14px 18px',
        color: '#fff',
        overflowY: 'auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Moderation</h1>

        <button
          onClick={() => window.close()}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            marginTop: 6,
          }}
        >
          ✖ Close
        </button>
      </div>

      <Stats pending={pending.length} approved={approved.length} rejected={rejected.length} />

      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Section title="Pending" color="#ffd966" data={pending} onApprove={handleApprove} onReject={handleReject} onImageClick={setSelectedImg} />
          <Section title="Approved" color="#00ff88" data={approved} onDelete={handleDelete} showDelete onImageClick={setSelectedImg} />
          <Section title="Rejected" color="#ff4444" data={rejected} onDelete={handleDelete} showDelete onImageClick={setSelectedImg} />
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: toast.color, padding: '8px 16px', borderRadius: 8,
          color: '#000', fontWeight: 600, zIndex: 9999,
        }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ✅ Stats Strip */
function Stats({ pending, approved, rejected }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 14, marginBottom: 10 }}>
      <span>🕓 {pending} Pending</span>
      <span>✅ {approved} Approved</span>
      <span>🚫 {rejected} Rejected</span>
    </div>
  );
}

/* ✅ Section Component */
function Section({ title, color, data, onApprove, onReject, onDelete, showDelete, onImageClick }) {
  return (
    <div>
      <h2 style={{ marginBottom: 6, borderLeft: `4px solid ${color}`, paddingLeft: 8 }}>{title} ({data.length})</h2>
      {data.length === 0 ? <p style={{ color: '#ccc' }}>None</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
          {data.map((s) => (
            <div key={s.id} style={{ display: 'flex', background: '#0b0f19', borderRadius: 8, overflow: 'hidden', border: '1px solid #333', height: 110 }}>
              <div style={{ flex: '0 0 45%', cursor: s.photo_url ? 'pointer' : 'default' }} onClick={() => s.photo_url && onImageClick(s.photo_url)}>
                {s.photo_url ?
                  <img src={s.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  <div style={{ background: '#222', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777' }}>No Img</div>
                }
              </div>
              <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: 12 }}>{s.nickname || 'Anonymous'}</strong>
                  <p style={{ fontSize: 11, color: '#ccc', lineHeight: 1.2, overflow: 'hidden' }}>{s.message || '(no message)'}</p>
                </div>

                {!showDelete ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => onApprove(s.id)} style={{ flex: 1, background: '#238636', color: '#fff', borderRadius: 4 }}>✅</button>
                    <button onClick={() => onReject(s.id)} style={{ flex: 1, background: '#da3633', color: '#fff', borderRadius: 4 }}>🚫</button>
                  </div>
                ) : (
                  <button onClick={() => onDelete(s.id)} style={{ width: '100%', background: '#444', color: '#fff', borderRadius: 4 }}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
