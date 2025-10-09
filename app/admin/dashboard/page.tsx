'use client';

import { useEffect, useState } from 'react';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
  toggleEventStatus,
  updateEventSettings,
} from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

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

  // ✅ Realtime updates for pending posts
  useEffect(() => {
    if (!host) return;

    const channel = supabase
      .channel('realtime:events')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          const updatedEvent = payload.new;
          setEvents((prev) =>
            prev.map((ev) =>
              ev.id === updatedEvent.id
                ? { ...ev, pending_posts: updatedEvent.pending_posts }
                : ev
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [host]);

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
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  // ✅ Clear posts
  async function handleClear(id: string) {
    if (!confirm('Remove all posts from this wall?')) return;
    await clearEventPosts(id);
    alert('All posts cleared.');
  }

  // ✅ Toggle live/inactive
  async function handleToggle(id: string, isLive: boolean) {
    await toggleEventStatus(id, isLive);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  // ✅ Launch wall (popup-safe)
  async function handleLaunch(id: string) {
    const newTab = window.open(`${window.location.origin}/wall/${id}`, '_blank');
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
    if (ev?.countdown && new Date(ev.countdown).getTime() > Date.now()) {
      alert('⏳ Countdown active — wall will go live automatically.');
    } else {
      await supabase.from('events').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', id);
    }
  }

  // ✅ Save settings from modal
  async function handleSaveSettings(updated: any) {
    await updateEventSettings(updated.id, updated);
    const refreshed = await getEventsByHost(host.id);
    setEvents(refreshed);
    setSelectedEvent(null);
  }

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>;

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 20 }}>🎛 Host Dashboard</h1>
      <img src="/faninteractlogo.png" alt="FanInteract Logo" style={{ width: 120, marginBottom: 10 }} />
      <button onClick={handleCreate} style={buttonStyle}>➕ New Fan Zone Wall</button>

      {/* Grid of event cards */}
      <div style={gridStyle}>
        {events.length === 0 && <p>No experiences created yet.</p>}
        {events.map((event) => (
          <div key={event.id} style={{ ...cardStyle, background: event.background_value || '#222' }}>
            <h3>{event.host_title || `${event.title} Fan Zone Wall`}</h3>
            <p style={{ marginBottom: 6 }}>
              <strong style={{ color: '#ccc' }}>Public Title:</strong> {event.title}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Status:</strong>{' '}
              <span style={{ color: event.status === 'live' ? 'lime' : 'orange' }}>
                {event.status}
              </span>
            </p>

            <div style={cardButtons}>
              <button onClick={() => handleLaunch(event.id)} style={launchBtn}>🚀 Launch</button>
              <button onClick={() => handleToggle(event.id, event.status !== 'live')} style={smallBtn}>
                {event.status === 'live' ? '🟥 Stop' : '🟢 Go Live'}
              </button>
              <button onClick={() => handleClear(event.id)} style={smallBtn}>🧹 Clear</button>
              <button onClick={() => handleDelete(event.id)} style={deleteBtn}>❌ Delete</button>
            </div>

            {/* Options + Pending */}
            <div style={cardFooter}>
              <button onClick={() => setSelectedEvent(event)} style={optionsBtn}>⚙️ Options</button>
              <button style={pendingBtn}>
                🔔 Pending ({event.pending_posts ?? 0})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Simple settings modal */}
      {selectedEvent && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h2>⚙️ Edit Wall Settings</h2>
            <label>
              Host Title:
              <input
                type="text"
                defaultValue={selectedEvent.host_title || ''}
                style={inputStyle}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, host_title: e.target.value })
                }
              />
            </label>
            <label>
              Public Title:
              <input
                type="text"
                defaultValue={selectedEvent.title || ''}
                style={inputStyle}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
              />
            </label>
            <label>
              Countdown (ISO):
              <input
                type="datetime-local"
                style={inputStyle}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, countdown: e.target.value })
                }
              />
            </label>
            <label>
              Background (color or gradient):
              <input
                type="text"
                defaultValue={selectedEvent.background_value || ''}
                style={inputStyle}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, background_value: e.target.value })
                }
              />
            </label>

            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <button style={saveBtn} onClick={() => handleSaveSettings(selectedEvent)}>
                💾 Save
              </button>
              <button style={cancelBtn} onClick={() => setSelectedEvent(null)}>
                ✖ Close
              </button>
            </div>
          </div>
        </div>
      )}
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
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: 280,
};

const cardButtons: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginTop: 10,
};

const cardFooter: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 15,
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

const deleteBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#a33' };
const launchBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#16a34a', fontWeight: 600 };
const optionsBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#1e90ff' };
const pendingBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#ffaa00', fontWeight: 600 };

const modalBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const modalBox: React.CSSProperties = {
  background: '#222',
  padding: 20,
  borderRadius: 10,
  width: 350,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #555',
  marginTop: 4,
  background: '#111',
  color: '#fff',
};

const saveBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#16a34a', fontWeight: 600 };
const cancelBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#a33' };
