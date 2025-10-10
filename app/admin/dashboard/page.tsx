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

/* ---------------- BASE STYLES ---------------- */
const inputStyle: React.CSSProperties = {
  width: '95%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #555',
  marginTop: 4,
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'block',
  background: '#111',
  color: '#fff',
};

const DEFAULT_GRADIENT = 'linear-gradient(135deg,#0d47a1,#1976d2)';

export default function DashboardPage() {
  const [host, setHost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  /* ---------------- LOAD HOST EVENTS ---------------- */
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

  /* ---------------- CRUD HANDLERS ---------------- */
  async function handleCreateConfirm() {
    if (!newTitle.trim()) return;
    await createEvent(host.id, { title: newTitle.trim() });
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
    setCreatingNew(false);
    setNewTitle('');
  }

  async function handleDelete(id: string) {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setConfirmingDelete(null);
  }

  async function handleClear(id: string) {
    await clearEventPosts(id);
    await supabase.from('events')
      .update({ status: 'cleared', updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function handleLaunch(id: string) {
    const wallUrl = `${window.location.origin}/wall/${id}`;
    const popup = window.open(
      wallUrl,
      '_blank',
      'width=1200,height=800,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
    popup?.focus();
  }

  async function handleStart(id: string) {
    await supabase.from('events')
      .update({ status: 'live', updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  async function handleStop(id: string) {
    await supabase.from('events')
      .update({ status: 'inactive', countdown: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    const updated = await getEventsByHost(host.id);
    setEvents(updated);
  }

  function handleOpenModeration(id: string) {
    const modUrl = `${window.location.origin}/admin/moderation/${id}`;
    window.open(
      modUrl,
      '_blank',
      'width=1200,height=700,left=200,top=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
  }

  /* ---------------- BACKGROUND CHANGE ---------------- */
  async function handleBackgroundChange(event: any, newValue: string) {
    const card = document.getElementById(`card-${event.id}`);
    const modal = document.getElementById('options-modal');
    [card, modal].forEach((el) => {
      if (el) {
        el.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], {
          duration: 1000,
          easing: 'ease-in-out',
        });
        el.style.transition = 'background 2s ease';
        el.style.background = newValue;
      }
    });

    await supabase
      .from('events')
      .update({
        background_value: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);

    const refreshed = await getEventsByHost(host.id);
    setEvents(refreshed);
  }

  /* ---------------- COLORS + GRADIENTS ---------------- */
  const solidColors = [
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1',
    '#3949ab', '#1e88e5', '#039be5', '#00acc1',
    '#00897b', '#43a047', '#7cb342', '#c0ca33',
    '#fdd835', '#fb8c00', '#f4511e', '#6d4c41'
  ];

  const nflGradients = [
    'linear-gradient(135deg,#002244,#69BE28)', 'linear-gradient(135deg,#00338D,#C60C30)',
    'linear-gradient(135deg,#203731,#FFB612)', 'linear-gradient(135deg,#0B2265,#A71930)',
    'linear-gradient(135deg,#241773,#9E7C0C)', 'linear-gradient(135deg,#03202F,#FB4F14)',
    'linear-gradient(135deg,#002244,#B0B7BC)', 'linear-gradient(135deg,#002C5F,#FFC20E)',
    'linear-gradient(135deg,#E31837,#C60C30)', 'linear-gradient(135deg,#002C5F,#A5ACAF)',
    'linear-gradient(135deg,#5A1414,#D3BC8D)', 'linear-gradient(135deg,#4F2683,#FFC62F)',
    'linear-gradient(135deg,#A71930,#FFB612)', 'linear-gradient(135deg,#000000,#FB4F14)',
    'linear-gradient(135deg,#004C54,#A5ACAF)', 'linear-gradient(135deg,#A5ACAF,#0B2265)',
  ];

  const countdownOptions = [
    '30 Seconds', '1 Minute', '2 Minutes', '3 Minutes', '4 Minutes', '5 Minutes',
    '10 Minutes', '15 Minutes', '20 Minutes', '25 Minutes', '30 Minutes',
    '35 Minutes', '40 Minutes', '45 Minutes', '50 Minutes', '55 Minutes', '60 Minutes',
  ];

  if (loading)
    return <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>;

  /* ---------------- RENDER ---------------- */
  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 15 }}>🎛 Host Dashboard</h1>
      <img src="/faninteractlogo.png" alt="FanInteract Logo" style={{ width: 110, marginBottom: 10 }} />

      {/* CREATE NEW WALL */}
      {!creatingNew ? (
        <button onClick={() => setCreatingNew(true)} style={buttonStyle}>➕ New Fan Zone Wall</button>
      ) : (
        <div style={newCardOverlay}>
          <div style={newCardBox}>
            <h3>🆕 Create New Fan Zone Wall</h3>
            <input
              type="text"
              placeholder="Enter a title for your new Fan Zone Wall"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={handleCreateConfirm} style={{ ...smallBtn, backgroundColor: '#16a34a' }}>💾 Create</button>
              <button onClick={() => setCreatingNew(false)} style={{ ...smallBtn, backgroundColor: '#a33' }}>✖ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* GRID OF WALL CARDS */}
      <div style={gridStyle}>
        {events.map((event) => (
          <div
            key={event.id}
            id={`card-${event.id}`}
            style={{
              ...cardStyle,
              background: event.background_value || DEFAULT_GRADIENT,
              transition: 'background 2s ease',
            }}
          >
            <h3 style={{ fontSize: 14 }}>{event.host_title || `${event.title} Fan Zone Wall`}</h3>
            <p style={{ fontSize: 12 }}>
              <strong>Status:</strong>{' '}
              <span style={{
                color: event.status === 'live' ? 'lime'
                  : event.status === 'cleared' ? '#00bcd4'
                  : 'orange'
              }}>{event.status}</span>
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
                  <p>Confirm delete?</p>
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
              <button onClick={() => setSelectedEvent(event)} style={optionsBtn}>⚙ Options</button>
              <button onClick={() => handleOpenModeration(event.id)} style={pendingBtn}>
                🔔 Pending ({event.pending_posts ?? 0})
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* OPTIONS MODAL */}
      {selectedEvent && (
        <div
          id="options-modal"
          style={{
            ...modalBox,
            background: selectedEvent.background_value || DEFAULT_GRADIENT,
            transition: 'background 2s ease',
          }}
        >
          <h3 style={{ textAlign: 'center' }}>⚙ Edit Wall Settings</h3>

          <label>Host Title:</label>
          <input
            type="text"
            value={selectedEvent.host_title || ''}
            style={{ ...inputStyle, width: '88%' }}
            onChange={(e) =>
              setSelectedEvent({ ...selectedEvent, host_title: e.target.value })
            }
          />

          <label>Public Title:</label>
          <input
            type="text"
            value={selectedEvent.title || ''}
            style={{ ...inputStyle, width: '95%' }}
            onChange={(e) =>
              setSelectedEvent({ ...selectedEvent, title: e.target.value })
            }
          />

          <label>Countdown:</label>
          <select
            style={inputStyle}
            value={selectedEvent.countdown || ''}
            onChange={(e) =>
              setSelectedEvent({ ...selectedEvent, countdown: e.target.value })
            }
          >
            {[
              '30 Seconds','1 Minute','2 Minutes','3 Minutes','4 Minutes','5 Minutes',
              '10 Minutes','15 Minutes','20 Minutes','25 Minutes','30 Minutes',
              '35 Minutes','40 Minutes','45 Minutes','50 Minutes','55 Minutes','60 Minutes',
            ].map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          {/* 💾 SAVE CHANGES BUTTON */}
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await supabase
                  .from('events')
                  .update({
                    host_title: selectedEvent.host_title || '',
                    title: selectedEvent.title || '',
                    countdown: selectedEvent.countdown || null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', selectedEvent.id);

                const refreshed = await getEventsByHost(host.id);
                setEvents(refreshed);
                setSaving(false); // ✅ stays open after save
              }}
              style={{
                ...smallBtn,
                backgroundColor: saving ? '#555' : '#16a34a',
                width: '60%',
                marginTop: 8,
              }}
            >
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>

          <h4 style={{ marginTop: 10 }}>Solid Colors</h4>
          <div style={colorGrid}>
            {[
              '#e53935','#d81b60','#8e24aa','#5e35b1','#3949ab','#1e88e5','#039be5','#00acc1',
              '#00897b','#43a047','#7cb342','#c0ca33','#fdd835','#fb8c00','#f4511e','#6d4c41',
            ].map((c) => (
              <div
                key={c}
                style={{ ...colorCircle, background: c }}
                onClick={() => handleBackgroundChange(selectedEvent, c)}
              />
            ))}
          </div>

          <h4 style={{ marginTop: 10 }}>Gradients</h4>
          <div style={colorGrid}>
            {[
              'linear-gradient(135deg,#002244,#69BE28)',
              'linear-gradient(135deg,#00338D,#C60C30)',
              'linear-gradient(135deg,#203731,#FFB612)',
              'linear-gradient(135deg,#0B2265,#A71930)',
              'linear-gradient(135deg,#241773,#9E7C0C)',
              'linear-gradient(135deg,#03202F,#FB4F14)',
              'linear-gradient(135deg,#002244,#B0B7BC)',
              'linear-gradient(135deg,#002C5F,#FFC20E)',
              'linear-gradient(135deg,#E31837,#C60C30)',
              'linear-gradient(135deg,#002C5F,#A5ACAF)',
              'linear-gradient(135deg,#5A1414,#D3BC8D)',
              'linear-gradient(135deg,#4F2683,#FFC62F)',
              'linear-gradient(135deg,#A71930,#FFB612)',
              'linear-gradient(135deg,#000000,#FB4F14)',
              'linear-gradient(135deg,#004C54,#A5ACAF)',
              'linear-gradient(135deg,#A5ACAF,#0B2265)',
            ].map((g) => (
              <div
                key={g}
                style={{ ...colorCircle, background: g }}
                onClick={() => handleBackgroundChange(selectedEvent, g)}
              />
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <button onClick={() => setSelectedEvent(null)} style={cancelBtn}>
              ✖ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLE CONSTANTS ---------------- */
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  minHeight: '100vh',
  background: 'linear-gradient(180deg,#0d0d0d,#1a1a1a)',
  color: '#fff',
  padding: '20px 10px',
  fontFamily: 'system-ui,sans-serif',
};

const buttonStyle = {
  backgroundColor: '#1e90ff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const newCardOverlay = {
  width: 250,
  marginTop: 15,
  background: '#222',
  borderRadius: 10,
  padding: 14,
  textAlign: 'center' as const,
  boxShadow: '0 0 10px rgba(0,0,0,0.3)',
};

const newCardBox = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
};

const gridStyle = {
  marginTop: 15,
  display: 'grid',
  gridTemplateColumns: 'repeat(4,1fr)',
  gap: 10,
  width: '100%',
  maxWidth: 1080,
  justifyItems: 'center' as const,
};

const cardStyle = {
  borderRadius: 10,
  padding: 10,
  textAlign: 'center' as const,
  color: '#fff',
  boxShadow: '0 0 10px rgba(0,0,0,0.25)',
  width: '100%',
  maxWidth: 230,
  transition: 'all 0.3s ease',
};

const cardButtons = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap' as const,
  justifyContent: 'center' as const,
  marginTop: 6,
};

const cardFooter = {
  display: 'flex',
  justifyContent: 'space-between' as const,
  marginTop: 8,
};

const smallBtn = {
  backgroundColor: '#444',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
};

const clearBtn = { ...smallBtn, backgroundColor: '#00bcd4', fontWeight: 600 };
const launchBtn = { ...smallBtn, backgroundColor: '#007bff', fontWeight: 600 };
const playBtn = { ...smallBtn, backgroundColor: '#16a34a', fontWeight: 600 };
const stopBtn = { ...smallBtn, backgroundColor: '#d12f2f', fontWeight: 600 };
const deleteBtn = { ...smallBtn, backgroundColor: '#a33' };
const optionsBtn = { ...smallBtn, backgroundColor: '#1e90ff' };
const pendingBtn = { ...smallBtn, backgroundColor: '#ffaa00', fontWeight: 600 };
const cancelBtn = { ...smallBtn, backgroundColor: '#a33', width: '100%' };

const confirmOverlay = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%,-50%)',
  background: '#222',
  border: '1px solid #555',
  borderRadius: 10,
  padding: '12px 16px',
  boxShadow: '0 0 10px rgba(0,0,0,0.6)',
  zIndex: 10,
  textAlign: 'center' as const,
};

const modalBox = {
  position: 'fixed' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%,-50%)',
  padding: 15,
  borderRadius: 10,
  width: 320,
  zIndex: 999,
  boxShadow: '0 0 20px rgba(0,0,0,0.7)',
  color: '#fff',
};

const colorGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(8,1fr)',
  gap: 6,
  marginTop: 5,
};

const colorCircle = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  cursor: 'pointer',
  border: '1px solid #555',
  transition: 'transform 0.2s ease, background 0.5s ease',
};
