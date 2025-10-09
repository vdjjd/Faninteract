'use client';

import { useEffect, useState } from 'react';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
} from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Load host + events
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setHost(user);
      const fetched = await getEventsByHost(user.id);
      setEvents(fetched);
      setLoading(false);
    }
    fetchData();
  }, []);

  // ✅ Create new event
  async function handleCreate() {
    const title = prompt('Enter a title for your new Fan Zone Wall:');
    if (!title) return;
    await createEvent(host.id, { title });
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  // ✅ Delete event
  async function handleDelete(id: string) {
    if (!confirm('Are you sure? This will permanently delete this wall.')) return;
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  // ✅ Clear posts
  async function handleClear(id: string) {
    if (!confirm('Remove all posts from this wall?')) return;
    await clearEventPosts(id);
    alert('All posts cleared.');
  }

  // ✅ Launch popup only
  async function handleLaunch(id: string) {
    const wallUrl = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      wallUrl,
      '_blank',
      'width=1200,height=800,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  // ✅ Start wall or countdown
  async function handleStart(id: string) {
    const { data: ev, error } = await supabase.from('events').select('*').eq('id', id).single();
    if (error || !ev) {
      alert('Error fetching event.');
      return;
    }

    if (ev.countdown && new Date(ev.countdown).getTime() > Date.now()) {
      alert('⏳ Countdown started — wall will go live automatically.');
    } else {
      await supabase
        .from('events')
        .update({ status: 'live', updated_at: new Date().toISOString() })
        .eq('id', id);
      alert('✅ Wall is now live!');
    }

    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  // ✅ Stop wall (reset timer + deactivate)
  async function handleStop(id: string) {
    const { error } = await supabase
      .from('events')
      .update({
        status: 'inactive',
        countdown: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('❌ Error stopping wall:', error.message);
      alert('Error stopping wall.');
      return;
    }

    alert('🟥 Wall stopped and countdown reset.');
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>;

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 20 }}>🎛 Host Dashboard</h1>
      <img src="/faninteractlogo.png" alt="FanInteract Logo" style={{ width: 120, marginBottom: 10 }} />
      <button onClick={handleCreate} style={buttonStyle}>➕ New Fan Zone Wall</button>

      <div style={gridStyle}>
        {events.length === 0 && <p>No experiences created yet.</p>}
        {events.map((event) => (
          <div key={event.id} style={{ ...cardStyle, background: event.background_value || '#222' }}>
            <h3>{event.title}</h3>
            <p>
              Status:{' '}
              <strong style={{ color: event.status === 'live' ? 'lime' : 'orange' }}>
                {event.status}
              </strong>
            </p>

            <div style={cardButtons}>
              <button onClick={() => handleLaunch(event.id)} style={launchBtn}>
                🚀 Launch
              </button>
              <button onClick={() => handleStart(event.id)} style={playBtn}>
                ▶️ Play
              </button>
              <button onClick={() => handleStop(event.id)} style={stopBtn}>
                ⏹ Stop
              </button>
            </div>

            <div style={cardButtons}>
              <button onClick={() => handleClear(event.id)} style={smallBtn}>
                🧹 Clear
              </button>
              <button onClick={() => handleDelete(event.id)} style={deleteBtn}>
                ❌ Delete
              </button>
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
  justifyContent: 'flex-start',
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0d0d0d, #1a1a1a)',
  color: '#fff',
  padding: '40px 10px',
  fontFamily: 'system-ui, sans-serif',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#1e90ff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const gridStyle: React.CSSProperties = {
  marginTop: 20,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 20,
  width: '100%',
  maxWidth: 1200,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: 20,
  textAlign: 'center',
  color: '#fff',
  boxShadow: '0 0 15px rgba(0,0,0,0.3)',
};

const cardButtons: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginTop: 10,
};

const smallBtn: React.CSSProperties = {
  backgroundColor: '#444',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
};

const launchBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#007bff', fontWeight: 600 };
const playBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#16a34a', fontWeight: 600 };
const stopBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#d12f2f', fontWeight: 600 };
const deleteBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#a33' };
