'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveWallProps {
  event: any;
  posts: any[];
}

/* ---------- TRANSITION MAP ---------- */
const transitions: Record<string, any> = {
  'Fade In / Fade Out': {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.8 },
  },
  'Slide Up / Slide Out': {
    initial: { y: 80, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -80, opacity: 0 },
    transition: { duration: 0.7 },
  },
  'Slide Down / Slide Out': {
    initial: { y: -80, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 80, opacity: 0 },
    transition: { duration: 0.7 },
  },
  'Slide Left / Slide Right': {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
    transition: { duration: 0.7 },
  },
  'Zoom In / Zoom Out': {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    transition: { duration: 0.6 },
  },
  Flip: {
    initial: { rotateY: 180, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -180, opacity: 0 },
    transition: { duration: 0.8 },
  },
  'Rotate In / Rotate Out': {
    initial: { rotate: 45, opacity: 0 },
    animate: { rotate: 0, opacity: 1 },
    exit: { rotate: -45, opacity: 0 },
    transition: { duration: 0.8 },
  },
};

/* ---------- LIVE WALL ---------- */
export default function LiveWall({ event, posts }: LiveWallProps) {
  const [livePosts, setLivePosts] = useState(posts || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = livePosts[currentIndex];
  const transitionStyle = transitions[event?.post_transition || 'Fade In / Fade Out'];

  /* ---------- INITIAL FETCH ---------- */
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

  /* ---------- REALTIME SUBSCRIPTIONS ---------- */
  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`live-submissions-${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${event.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'approved') {
            setLivePosts((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new.status === 'approved') {
            setLivePosts((prev) => {
              const exists = prev.find((p) => p.id === payload.new.id);
              if (exists) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setLivePosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  /* ---------- CYCLE THROUGH POSTS ---------- */
  useEffect(() => {
    if (!livePosts || livePosts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % livePosts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [livePosts]);

  /* ---------- BACKGROUND ---------- */
  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  /* ---------- RENDER ---------- */
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
        position: 'relative',
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
          justifyContent: 'center',
        }}
      >
        {/* ---------- STATIC LEFT PHOTO + LOGO LAYOUT ---------- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          {/* LEFT PHOTO + CONTENT AREA (ANIMATES) */}
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.id}
                {...transitionStyle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                {/* PHOTO */}
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
                  }}
                />

                {/* RIGHT SIDE TEXT CONTENT ONLY (no logo here) */}
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
                  <h2
                    style={{
                      fontWeight: 900,
                      color: '#fff',
                      textShadow: '0 0 15px rgba(0,0,0,0.7)',
                      fontSize: 'clamp(2rem, 3vw, 4rem)',
                      margin: 0,
                    }}
                  >
                    {current.nickname || ''}
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
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-posts"
                {...transitions['Fade In / Fade Out']}
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '2rem',
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                No Approved Submissions Yet
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------- STATIC OVERLAY: LOGO + GREY BAR ---------- */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '10%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 'clamp(260px, 26vw, 380px)',
              marginBottom: '0.8vh',
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

          <div
            style={{
              width: '100%',
              height: 14,
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 12px rgba(0,0,0,0.7)',
              opacity: 0.85,
              marginBottom: '1.5vh',
            }}
          ></div>
        </div>
      </div>

      {/* ---------- QR SECTION ---------- */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(17vh - 90px)',
          left: 'calc(9vw - 90px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            textAlign: 'center',
            textShadow: '0 0 10px rgba(0,0,0,0.6)',
            fontWeight: 700,
            fontSize: 'clamp(1.2rem, 1.8vw, 2rem)',
            marginBottom: '0.8vh',
          }}
        >
          Scan Me To Join
        </p>
        <QRCodeCanvas
          value={`https://faninteract.vercel.app/submit/${event.id}`}
          size={180}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={false}
          style={{
            borderRadius: 12,
            boxShadow: '0 0 18px rgba(0,0,0,0.6)',
          }}
        />
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
