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

/* ---------------- STYLES THAT MUST LOAD EARLY ---------------- */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #555',
  marginTop: 4,
  background: '#111',
  color: '#fff',
};

const nflGradients = [
  'linear-gradient(135deg,#00338D,#C60C30)', // Bills
  'linear-gradient(135deg,#002244,#69BE28)', // Seahawks
  'linear-gradient(135deg,#0B162A,#C83803)', // Bears
  'linear-gradient(135deg,#002244,#FB4F14)', // Broncos
  'linear-gradient(135deg,#203731,#FFB612)', // Packers
  'linear-gradient(135deg,#0C2340,#C8102E)', // Patriots
  'linear-gradient(135deg,#101820,#D50A0A)', // Falcons
  'linear-gradient(135deg,#002244,#D7A22A)', // Rams
  'linear-gradient(135deg,#002244,#E31837)', // Texans
  'linear-gradient(135deg,#003594,#FFB81C)', // Chargers
  'linear-gradient(135deg,#203731,#A71930)', // Cardinals
  'linear-gradient(135deg,#002244,#69BE28)', // Jets
  'linear-gradient(135deg,#4B92DB,#002244)', // Lions
  'linear-gradient(135deg,#E31837,#203731)', // Chiefs
  'linear-gradient(135deg,#0C2340,#FFB81C)', // Steelers
  'linear-gradient(135deg,#002244,#69BE28)', // Eagles
  'linear-gradient(135deg,#241773,#9E7C0C)', // Ravens
  'linear-gradient(135deg,#002244,#FB4F14)', // Browns
  'linear-gradient(135deg,#002244,#B0B7BC)', // Cowboys
  'linear-gradient(135deg,#003594,#FFB81C)', // Vikings
  'linear-gradient(135deg,#311D00,#FFB612)', // Saints
  'linear-gradient(135deg,#AA0000,#B3995D)', // 49ers
  'linear-gradient(135deg,#5B2B82,#A5ACAF)', // Raiders
  'linear-gradient(135deg,#002244,#C60C30)', // Giants
  'linear-gradient(135deg,#002244,#9E7C0C)', // Commanders
  'linear-gradient(135deg,#2C2A29,#A71930)', // Buccaneers
  'linear-gradient(135deg,#101820,#D50A0A)', // Panthers
  'linear-gradient(135deg,#00338D,#C60C30)', // Colts
  'linear-gradient(135deg,#002244,#FB4F14)', // Bengals
  'linear-gradient(135deg,#002244,#E31837)', // Titans
  'linear-gradient(135deg,#0B162A,#C83803)', // Steelers alt
  'linear-gradient(135deg,#AA0000,#B3995D)', // 49ers alt
];

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
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

  // ✅ Create new event
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

  // ✅ Clear posts and mark cleared
  async function handleClear(id: string) {
    await clearEventPosts(id);
    await supabase
      .from('events')
      .update({ status: 'cleared', updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  // ✅ Launch wall in popup
  async function handleLaunch(id: string) {
    const wallUrl = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      wallUrl,
      '_blank',
      'width=1200,height=800,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  // ✅ Start wall silently
  async function handleStart(id: string) {
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
    if (!ev) return;
    await supabase.from('events').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  // ✅ Stop wall silently
  async function handleStop(id: string) {
    await supabase
      .from('events')
      .update({ status: 'inactive', countdown: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
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

      {/* Inline Create New Fan Zone Wall */}
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

      {/* Event Grid */}
      <div style={gridStyle}>
        {events.map((event) => (
          <div
            key={event.id}
            data-id={event.id}
            style={{ ...cardStyle, background: event.background_value || '#222' }}
          >
            <h3>{event.host_title || `${event.title} Fan Zone Wall`}</h3>
            <p>
              <strong>Status:</strong>{' '}
              <span
                style={{
                  color:
                    event.status === 'live'
                      ? 'lime'
                      : event.status === 'cleared'
                      ? '#00bcd4'
                      : 'orange',
                }}
              >
                {event.status}
              </span>
            </p>

            <div style={cardButtons}>
              <button onClick={() => handleLaunch(event.id)} style={launchBtn}>🚀 Launch</button>
              <button onClick={() => handleStart(event.id)} style={playBtn}>▶️ Play</button>
              <button onClick={() => handleStop(event.id)} style={stopBtn}>⏹ Stop</button>
            </div>

            <div style={cardButtons}>
              <button onClick={() => handleClear(event.id)} style={clearBtn}>🧹 Clear</button>
              {confirmingDelete === event.id ? (
                <div style={confirmOverlay}>
                  <p style={{ margin: 0, fontSize: 14 }}>Confirm delete?</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => handleDelete(event.id)} style={{ ...smallBtn, backgroundColor: '#16a34a' }}>✅ Confirm</button>
                    <button onClick={() => setConfirmingDelete(null)} style={{ ...smallBtn, backgroundColor: '#a33' }}>✖ Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmingDelete(event.id)} style={deleteBtn}>❌ Delete</button>
              )}
            </div>

            <div style={cardFooter}>
              <button onClick={() => setSelectedEvent(event)} style={optionsBtn}>⚙️ Options</button>
              <button onClick={() => handleOpenModeration(event.id)} style={pendingBtn}>🔔 Pending ({event.pending_posts ?? 0})</button>
            </div>
          </div>
        ))}
      </div>

      {/* Settings Modal */}
      {selectedEvent && (
        <div style={modalBackdrop}>
          <div style={{ ...modalBox, background: selectedEvent.background_value || 'linear-gradient(180deg,#0d0d0d,#1a1a1a)' }}>
            <h2 style={{ textAlign: 'center' }}>⚙️ Edit Wall Settings</h2>
            <label>
              Host Title:
              <input type="text" value={selectedEvent.host_title || ''} style={inputStyle} onChange={(e) => setSelectedEvent({ ...selectedEvent, host_title: e.target.value })}/>
            </label>
            <label>
              Public Title:
              <input type="text" value={selectedEvent.title || ''} style={inputStyle} onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}/>
            </label>
            <label>
              Countdown:
              <select style={inputStyle} value={selectedEvent.countdown || ''} onChange={(e) => setSelectedEvent({ ...selectedEvent, countdown: e.target.value })}>
                <option value="">None</option>
                <option value="30">30 Seconds</option>
                <option value="60">1 Minute</option>
                <option value="120">2 Minutes</option>
                <option value="180">3 Minutes</option>
                <option value="240">4 Minutes</option>
                <option value="300">5 Minutes</option>
                <option value="600">10 Minutes</option>
                <option value="900">15 Minutes</option>
                <option value="1200">20 Minutes</option>
                <option value="1500">25 Minutes</option>
                <option value="1800">30 Minutes</option>
                <option value="3600">60 Minutes</option>
              </select>
            </label>

            <div style={{ marginTop: 10 }}>
              <h4>Solid Colors</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
                {['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#8B00FF','#00CED1','#FFD700','#FF69B4','#00FA9A','#FF4500','#20B2AA','#ADFF2F','#C71585','#708090'].map((color) => (
                  <div key={color} onClick={() => {
                    setSelectedEvent((prev: any) => ({ ...prev, background_value: color }));
                    const el = document.querySelector(`[data-id="${selectedEvent.id}"]`) as HTMLElement;
                    if (el) {
                      el.style.transition = 'background 2s ease';
                      el.style.background = color;
                    }
                  }} style={{
                    background: color, width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                    border: selectedEvent.background_value === color ? '3px solid #fff' : '1px solid #555',
                  }}/>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4>Gradients</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
                {nflGradients.map((grad, i) => (
                  <div key={i} onClick={() => {
                    setSelectedEvent((prev: any) => ({ ...prev, background_value: grad }));
                    const el = document.querySelector(`[data-id="${selectedEvent.id}"]`) as HTMLElement;
                    if (el) {
                      el.style.transition = 'background 2s ease';
                      el.style.background = grad;
                    }
                  }} style={{
                    background: grad, width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                    border: selectedEvent.background_value === grad ? '3px solid #fff' : '1px solid #555',
                  }}/>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
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
  position: 'relative',
  transition: 'background 2s ease',
};

const cardButtons: React.CSSProperties = {
  display: 'flex',
  gap: 8,
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

const clearBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#00bcd4', fontWeight: 600 };
const launchBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#007bff', fontWeight: 600 };
const playBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#16a34a', fontWeight: 600 };
const stopBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#d12f2f', fontWeight: 600 };
const deleteBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#a33' };
const optionsBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#1e90ff' };
const pendingBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#ffaa00', fontWeight: 600 };

const confirmOverlay: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: '#222',
  border: '1px solid #555',
  borderRadius: 10,
  padding: '12px 16px',
  boxShadow: '0 0 10px rgba(0,0,0,0.6)',
  zIndex: 10,
  textAlign: 'center',
};

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

const saveBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#16a34a', fontWeight: 600 };
const cancelBtn: React.CSSProperties = { ...smallBtn, backgroundColor: '#a33' };
