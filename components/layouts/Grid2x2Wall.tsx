'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

interface Grid2x2WallProps {
  event: any;
  posts: any[];
}

export default function Grid2x2Wall({ event, posts }: Grid2x2WallProps) {
  const [livePosts, setLivePosts] = useState(posts || []);

  // Fetch approved posts
  useEffect(() => {
    async function fetchApproved() {
      if (!event?.id) return;
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (!error && data) setLivePosts(data);
    }
    fetchApproved();
  }, [event?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`grid2x2-${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${event.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'approved') {
            setLivePosts((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  const visible = livePosts.slice(0, 4); // limit to 4 posts for 2x2 grid

  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '2vw',
        padding: '3vw',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ---------- GRID CELLS ---------- */}
      <AnimatePresence mode="wait">
        {visible.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(18px)',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 20,
              boxShadow: '0 0 25px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '1.5vw',
              textAlign: 'center',
            }}
          >
            {p.photo_url && (
              <img
                src={p.photo_url}
                alt={p.nickname}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 16,
                  boxShadow: '0 0 15px rgba(0,0,0,0.6)',
                  objectFit: 'cover',
                  marginBottom: '1vh',
                }}
              />
            )}
            <h2
              style={{
                fontWeight: 800,
                color: '#fff',
                textShadow: '0 0 15px rgba(0,0,0,0.7)',
                fontSize: 'clamp(1.5rem, 2vw, 2.5rem)',
                margin: 0,
              }}
            >
              {p.nickname || ''}
            </h2>
            <p
              style={{
                fontWeight: 600,
                color: '#eee',
                textShadow: '0 0 10px rgba(0,0,0,0.5)',
                fontSize: 'clamp(1rem, 1.5vw, 1.8rem)',
                marginTop: '0.5vh',
              }}
            >
              {p.message || ''}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ---------- QR + FULLSCREEN ---------- */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(10vh - 80px)',
          left: 'calc(6vw - 80px)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            textShadow: '0 0 10px rgba(0,0,0,0.6)',
            fontWeight: 700,
            fontSize: 'clamp(1rem, 1.5vw, 1.8rem)',
            marginBottom: '0.8vh',
          }}
        >
          Scan Me To Join
        </p>
        <QRCodeCanvas
          value={`https://faninteract.vercel.app/submit/${event.id}`}
          size={150}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          style={{
            borderRadius: 12,
            boxShadow: '0 0 18px rgba(0,0,0,0.6)',
          }}
        />
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          width: 48,
          height: 48,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'opacity 0.3s ease',
          opacity: 0.2,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.2')}
        onClick={() => {
          if (!document.fullscreenElement)
            document.documentElement.requestFullscreen().catch(console.error);
          else document.exitFullscreen();
        }}
        title="Toggle Fullscreen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="white"
          style={{ width: 26, height: 26 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"
          />
        </svg>
      </div>
    </div>
  );
}
