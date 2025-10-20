'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface LiveWallProps {
  event: any;
  posts: any[];
}

/* ---------- LIVE WALL ---------- */
export default function LiveWall({ event, posts }: LiveWallProps) {
  const [livePosts, setLivePosts] = useState(posts || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = livePosts[currentIndex];

  /* ---------- REALTIME SUBSCRIPTIONS ---------- */
  useEffect(() => {
    const channel = supabase
      .channel('submissions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'approved') {
            setLivePosts((prev) => [payload.new, ...prev]);
          }
          if (payload.eventType === 'UPDATE') {
            setLivePosts((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          }
          if (payload.eventType === 'DELETE') {
            setLivePosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---------- CYCLE THROUGH APPROVED POSTS ---------- */
  useEffect(() => {
    if (!livePosts || livePosts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % livePosts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [livePosts]);

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  return (
    <div
      style={{
        background: bg,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        transition: 'background 0.8s ease',
      }}
    >
      {/* ---------- TITLE ---------- */}
      <h1
        style={{
          color: '#fff',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
          fontWeight: 900,
          letterSpacing: '1px',
          marginTop: '3vh',
          marginBottom: '1.5vh',
          fontSize: 'clamp(2.5rem, 4vw, 5rem)',
          lineHeight: 1.1,
        }}
      >
        {event.title || 'Fan Zone Wall'}
      </h1>

      {/* ---------- DISPLAY AREA ---------- */}
      <div
        style={{
          width: '80vw',
          height: '70vh',
          backdropFilter: 'blur(18px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '10px 10px 30px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* ---------- GUEST PHOTO ---------- */}
        {current?.photo_url ? (
          <img
            src={current.photo_url}
            alt="Guest Submission"
            style={{
              borderRadius: 16,
              marginLeft: '4vw',
              width: '45%',
              height: 'auto',
              boxShadow: '0 0 20px rgba(0,0,0,0.6)',
              objectFit: 'cover',
              transition: 'opacity 0.8s ease',
            }}
          />
        ) : (
          <div
            style={{
              marginLeft: '4vw',
              width: '45%',
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '2rem',
            }}
          >
            No photo
          </div>
        )}

        {/* ---------- RIGHT SIDE CONTENT ---------- */}
        <div
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            position: 'relative',
            transform: 'translateY(-11%)',
          }}
        >
          {/* ---------- LOGO ---------- */}
          <div
            style={{
              width: 'clamp(260px, 26vw, 380px)',
              marginBottom: '0.8vh',
              transform: 'translateY(-3vh)',
            }}
          >
            <img
              src={event.logo_url || '/faninteractlogo.png'}
              alt="Logo"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.85))',
              }}
            />
          </div>

          {/* ---------- GREY BAR ---------- */}
          <div
            style={{
              width: '92%',
              height: 14,
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 12px rgba(0,0,0,0.7)',
              opacity: 0.85,
              marginTop: '-3vh',
              marginBottom: '1.5vh',
            }}
          ></div>

          {/* ---------- NAME + MESSAGE ---------- */}
          {current ? (
            <>
              <h2
                style={{
                  fontWeight: 900,
                  color: '#fff',
                  textShadow: '0 0 15px rgba(0,0,0,0.7)',
                  fontSize: 'clamp(2rem, 3vw, 4rem)',
                  margin: 0,
                }}
              >
                {current.nickname || 'Guest Name'}
              </h2>
              <p
                style={{
                  fontWeight: 600,
                  color: '#eee',
                  textShadow: '0 0 10px rgba(0,0,0,0.5)',
                  fontSize: 'clamp(1.4rem, 2vw, 2.8rem)',
                  textAlign: 'center',
                  maxWidth: '80%',
                  marginTop: '1vh',
                }}
              >
                {current.message || ''}
              </p>
            </>
          ) : (
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.5rem',
                textAlign: 'center',
              }}
            >
              Waiting for approved submissions…
            </p>
          )}
        </div>

        {/* ---------- SMALL QR (BOTTOM-LEFT) ---------- */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/submit/${event.id}`}
            size={120}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      </div>

      {/* ---------- FULLSCREEN BUTTON ---------- */}
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
