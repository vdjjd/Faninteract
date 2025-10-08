'use client';

import { useEffect, useState } from 'react';
import { createEvent, getEventsByHost, deleteEvent, clearEventPosts, toggleEventStatus } from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch host + events on load
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

  // ✅ Delete event (with confirm)
  async function handleDelete(id: string) {
    const confirmDelete = confirm('Are you sure? This will permanently delete this wall.');
    if (!confirmDelete) return;

    await deleteEvent(id);
    setEvents(events.filter(e => e.id !== id));
  }

  // ✅ Clear posts from event
  async function handleClear(id: string) {
    const confirmClear = confirm('Remove all posts from this wall?');
    if (!confirmClear) return;

    await clearEventPosts(id);
    alert('All posts cleared.');
  }

  // ✅ Toggle live/inactive
  async function handleToggle(id: string, isLive: boolean) {
    await toggleEventStatus(id, isLive);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>;

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 20 }}>🎛 Host Dashboard</h1>
      <button onClick={handleCreate} style={buttonStyle}>➕ New Fan Zone Wall</button>

      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {events.length === 0 && <p>No experiences created yet.</p>}
        {events.map(event => (
          <div key={event.id} style={cardStyle}>
            <h3>{event.title}</h3>
            <p>Status: <strong style={{ color: event.status === 'live' ? 'lime' : 'orange' }}>{event.status}</strong></p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => handleToggle(event.id, event.status !== 'live')} style={smallBtn}>
                {event.status === 'live' ? '🟥 Stop Wall' : '🟢 Go Live'}
              </button>
              <button onClick={() => handleClear(event.id)} style={smallBtn}>🧹 Clear Posts</button>
              <button onClick={() => handleDelete(event.id)} style={deleteBtn}>❌ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- STYLES ----------------
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

const cardStyle: React.CSSProperties = {
  backgroundColor: '#222',
  borderRadius: 10,
  padding: 20,
  width: 300,
  textAlign: 'center',
  boxShadow: '0 0 10px rgba(0,0,0,0.3)',
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

const deleteBtn: React.CSSProperties = {
  ...smallBtn,
  backgroundColor: '#a33',
};
