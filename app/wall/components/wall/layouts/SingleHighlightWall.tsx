'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ---------- TRANSITION STYLES ---------- */
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
};

const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function SingleHighlightWall({ event, posts }: { event?: any; posts?: any[] }) {
  const [livePosts, setLivePosts] = useState(posts || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [live, setLive] = useState(event?.status === 'live');
  const [fading, setFading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [transitionLock, setTransitionLock] = useState(false);

  const transitionStyle = transitions[event?.post_transition || 'Fade In / Fade Out'];
  const displayDuration = speedMap[event?.transition_speed || 'Medium'] || 8000;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (livePosts.length && !hasLoadedOnce) setHasLoadedOnce(true);
  }, [livePosts, hasLoadedOnce]);

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

  /* ---------- FIXED REALTIME EFFECT ---------- */
  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase.channel('fan_walls-realtime', {
      config: { broadcast: { self: true, ack: true } },
    });

    const handler = (payload: any) => {
      const data = payload?.payload;
      if (!data || data.id !== event.id || transitionLock) return;

      if (data.status && data.status !== (live ? 'live' : 'inactive')) {
        setTransitionLock(true);
        setFading(true);

        if (data.status === 'inactive') {
          setTimeout(() => {
            setLive(false);
            setFading(false);
            setTransitionLock(false);
          }, 1000);
        } else if (data.status === 'live') {
          setTimeout(() => {
            setLive(true);
            setFading(false);
            setTransitionLock(false);
          }, 1000);
        }
      }

      if (payload.eventType === 'INSERT' && payload.new?.status === 'approved') {
        setLivePosts((prev) => [payload.new, ...prev]);
      }
    };

    channel.on('broadcast', { event: 'wall_status_changed' }, handler);

    // ✅ Subscribe safely (no async return)
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Joined fan_walls-realtime channel');
      }
    });

    channelRef.current = channel;

    // ✅ Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, live, transitionLock]);
  /* ---------- END FIXED BLOCK ---------- */

  useEffect(() => {
    if (event?.status === 'live' && !live) setLive(true);
  }, [event?.status, live]);

  useEffect(() => {
    if (!livePosts?.length) return;
    const interval = setInterval(
      () => setCurrentIndex((i) => (i + 1) % livePosts.length),
      displayDuration
    );
    return () => clearInterval(interval);
  }, [livePosts, displayDuration]);

  const handleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) elem.requestFullscreen();
    else document.exitFullscreen();
  };

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  const current = livePosts[currentIndex % (livePosts.length || 1)];

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
        position: 'relative',
        opacity: fading ? 0.4 : 1,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      <h1
        style={{
          color: '#fff',
          fontSize: 'clamp(2.5rem,4vw,5rem)',
          fontWeight: 900,
          marginTop: '3vh',
          marginBottom: '1.5vh',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(0,0,0,0.6)',
        }}
      >
        {event?.title || 'Fan Zone Wall'}
      </h1>

      <div
        style={{
          width: '90vw',
          height: '78vh',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 24,
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.15)',
          position: 'relative',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '40px',
            width: '42%',
            height: 'calc(100% - 80px)',
            overflow: 'hidden',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatePresence mode="wait">
            {current?.photo_url ? (
              <motion.img
                key={current.id}
                src={current.photo_url}
                {...transitionStyle}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 18,
                  boxShadow: '0 0 18px rgba(0,0,0,0.6)',
                }}
              />
            ) : (
              <motion.div
                key="no-photo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '2rem',
                  textAlign: 'center',
                }}
              >
                No Photo
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          style={{
            flexGrow: 1,
            marginLeft: '44%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            height: '100%',
            paddingTop: '3vh',
          }}
        >
          <div style={{ width: 'clamp(280px, 30vw, 420px)', marginBottom: '1.5vh' }}>
            <img
              src={event?.logo_url || '/faninteractlogo.png'}
              alt="Logo"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.85))',
              }}
            />
          </div>

          <div
            style={{
              width: '90%',
              height: 16,
              borderRadius: 6,
              background: 'linear-gradient(to right,#000,#444)',
              boxShadow: '0 0 14px rgba(0,0,0,0.7)',
              opacity: 0.9,
              marginTop: '1vh',
              marginBottom: '2vh',
            }}
          ></div>

          <p
            style={{
              fontWeight: 700,
              margin: 0,
              fontSize: 'clamp(1.6rem, 2.5vw, 3rem)',
              lineHeight: 1.2,
              textAlign: 'center',
              color: '#fff',
            }}
          >
            {current?.message || (hasLoadedOnce ? '' : 'Loading posts…')}
          </p>
        </div>
      </div>

      {/* ---------- QR CODE ---------- */}
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '5px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 'clamp(0.9rem, 1.4vw, 1.4rem)',
            marginBottom: '6px',
            textShadow:
              '0 0 12px rgba(255,255,255,0.8), 0 0 20px rgba(100,180,255,0.6)',
          }}
        >
          Scan Me To Join
        </p>

        <div
          style={{
            padding: 6,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            boxShadow:
              '0 0 25px rgba(255,255,255,0.6), 0 0 40px rgba(100,180,255,0.3), inset 0 0 10px rgba(0,0,0,0.4)',
          }}
        >
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/submit/${event?.id}`}
            size={140}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin={false}
            style={{ borderRadius: 10, display: 'block' }}
          />
        </div>
      </div>

      {/* ---------- FULLSCREEN BUTTON ---------- */}
      <button
        onClick={handleFullscreen}
        style={{
          position: 'absolute',
          bottom: '2vh',
          right: '2vw',
          width: 45,
          height: 45,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          fontSize: '1.2rem',
          opacity: 0.1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.35s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.boxShadow = '0 0 14px rgba(255,255,255,0.7)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.1';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
      >
        ⛶
      </button>
    </div>
  );
}