'use client';

import { useEffect, useState } from 'react';
import {
  createEvent,
  getEventsByHost,
  deleteEvent,
  clearEventPosts,
  updateEventSettings,
} from '@/lib/actions/events';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // 🆕 For inline create
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');

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

  // ✅ Create new event (inline overlay)
  async function handleCreateConfirm() {
    if (!newTitle.trim()) return;
    await createEvent(host.id, { title: newTitle.trim() });
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
    setCreatingNew(false);
    setNewTitle('');
  }

  // ✅ Delete event (inline confirm)
  async function handleDelete(id: string) {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setConfirmingDelete(null);
  }

  // ✅ Clear posts (silent)
  async function handleClear(id: string) {
    await clearEventPosts(id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
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

  // ✅ Play wall (silent)
  async function handleStart(id: string) {
    const { data: ev, error } = await supabase.from('events').select('*').eq('id', id).single();
    if (error || !ev) return;

    if (!ev.countdown || new Date(ev.countdown).getTime() <= Date.now()) {
      await supabase
        .from('events')
        .update({ status: 'live', updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  // ✅ Stop wall (silent)
  async function handleStop(id: string) {
    const { error } = await supabase
      .from('events')
      .update({
        status: 'inactive',
        countdown: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      const updated = await getEventsByHost(host.id);
      setEvents(updated);
    }
  }

  // ✅ Open moderation popup
  function handleOpenModeration(id: string) {
    const modUrl = `${window.location.origin}/admin/moderation/${id}`;
    window.open(
      modUrl,
      '_blank',
      'width=1200,height=700,left=200,top=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
  }

  // ✅ Save settings
  async function handleSaveSettings(updatedEvent: any) {
    await updateEventSettings(updatedEvent.id, updatedEvent);
    const refreshed = await getEventsByHost(host.id);
    setEvents(refreshed);
    setSelectedEvent(null);
  }

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>;

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 20 }}>🎛 Host Dashboard</h1>
      <img src="/faninteractlogo.png" alt="FanInteract Logo" style={{ width: 120, marginBottom: 10 }} />

      {/* Inline create new wall */}
      {!creatingNew ? (
        <button onClick={() => setCreatingNew(true)} style={buttonStyle}>
          ➕ New Fan Zone Wall
        </button>
      ) : (
        <div style={newCardOverlay}>
          <div style={newCardBox}>
            <h3 style={{ marginBottom: 10 }}>🆕 Create New Fan Zone Wall</h3>
            <input
              type="text"
              placeholder="Enter a title for your new Fan Zone Wall"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
              <button onClick={handleCreateConfirm} style={{ ...smallBtn, backgroundColor: '#16a34a' }}>
                💾 Create
              </button>
              <button onClick={() => setCreatingNew(false)} style={{ ...smallBtn, backgroundColor: '#a33' }}>
                ✖ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={gridStyle}>
        {events.length === 0 && <p>No experiences created yet.</p>}
        {events.map((event) => (
          <div
            key={event.id}
            style={{ ...cardStyle, background: event.background_value || '#222', position: 'relative' }}
          >
            <h3>{event.host_title || `${event.title} Fan Zone Wall`}</h3>
            <p>
              <strong>Status:</strong>{' '}
              <span style={{ color: event.status === 'live' ? 'lime' : 'orange' }}>
                {event.status}
              </span>
            </p>

            <div style={cardButtons}>
              <button onClick={() => handleLaunch(event.id)} style={launchBtn}>🚀 Launch</button>
              <button onClick={() => handleStart(event.id)} style={playBtn}>▶️ Play</button>
              <button onClick={() => handleStop(event.id)} style={stopBtn}>⏹ Stop</button>
            </div>

            <div style={cardButtons}>
              <button onClick={() => handleClear(event.id)} style={smallBtn}>🧹 Clear</button>

              {confirmingDelete === event.id ? (
                <div style={confirmOverlay}>
                  <p style={{ margin: 0, fontSize: 14 }}>Confirm delete?</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => handleDelete(event.id)}
                      style={{ ...smallBtn, backgroundColor: '#16a34a' }}
                    >
                      ✅ Confirm
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(null)}
                      style={{ ...smallBtn, backgroundColor: '#a33' }}
                    >
                      ✖ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmingDelete(event.id)} style={deleteBtn}>❌ Delete</button>
              )}
            </div>

            {/* Options + Pending */}
            <div style={cardFooter}>
              <button onClick={() => setSelectedEvent(event)} style={optionsBtn}>⚙️ Options</button>
              <button onClick={() => handleOpenModeration(event.id)} style={pendingBtn}>
                🔔 Pending ({event.pending_posts ?? 0})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Settings Modal */}
      {selectedEvent && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h2>⚙️ Edit Wall Settings</h2>
            <label>
              Host Title:
              <input
                type="text"
                value={selectedEvent.host_title || ''}
                style={inputStyle}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, host_title: e.target.value })}
              />
            </label>
            <label>
              Public Title:
              <input
                type="text"
                value={selectedEvent.title || ''}
                style={inputStyle}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
              />
            </label>
            <label>
              Countdown (datetime-local):
              <input
                type="datetime-local"
                style={inputStyle}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, countdown: e.target.value })}
              />
            </label>
            <label>
              Background (color/gradient URL):
              <input
                type="text"
                value={selectedEvent.background_value || ''}
                style={inputStyle}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, background_value: e.target.value })}
              />
            </label>

            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <button style={saveBtn} onClick={() => handleSaveSettings(selectedEvent)}>💾 Save</button>
              <button style={cancelBtn} onClick={() => setSelectedEvent(null)}>✖ Close</button>
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

const newCardOverlay: React.CSSProperties = {
  width: 300,
  marginTop: 20,
  background: '#222',
  borderRadius: 12,
  padding: 20,
  textAlign: 'center',
  boxShadow: '0 0 15px rgba(0,0,0,0.4)',
};

const newCardBox: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};
