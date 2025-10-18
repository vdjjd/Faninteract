'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

/* ---------- INTERFACES ---------- */
interface LiveWallProps {
  event: any;
  posts: any[];
}

interface GuestData {
  id: string;
  first_name: string;
  nickname: string | null;
}

/* ---------- LIVE WALL ---------- */
export default function LiveWall({ event, posts }: LiveWallProps) {
  const [current, setCurrent] = useState(0);
  const [guestData, setGuestData] = useState<Record<string, GuestData>>({});

  /* ---------- FADE BETWEEN POSTS ---------- */
  useEffect(() => {
    if (posts.length === 0) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % posts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [posts]);

  /* ---------- FETCH GUEST DATA ---------- */
  useEffect(() => {
    async function loadGuests() {
      if (posts.length === 0) return;
      const ids = posts.map((p) => p.user_id).filter(Boolean);
      if (ids.length === 0) return;

      const { data } = await supabase
        .from('guests')
        .select('id, first_name, nickname')
        .in('id', ids);

      if (data) {
        const mapped: Record<string, GuestData> = {};
        data.forEach((g) => (mapped[g.id] = g));
        setGuestData(mapped);
      }
    }
    loadGuests();
  }, [posts]);

  if (!event || posts.length === 0) {
    return (
      <div
        style={{
          color: '#fff',
          textAlign: 'center',
          fontSize: '2rem',
          marginTop: '30vh',
        }}
      >
        Waiting for approved posts…
      </div>
    );
  }

  const currentPost = posts[current];
  const guest = currentPost?.user_id
    ? guestData[currentPost.user_id]
    : undefined;

  const displayName =
    currentPost.nickname?.trim() ||
    guest?.nickname?.trim() ||
    guest?.first_name ||
    'Guest';

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  return (
    <>
      <style>{`
        .fade-container { position: relative; width: 100%; height: 100%; overflow: hidden; }
        .fade-item {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          opacity: 0; transition: opacity 1.5s ease-in-out;
          display: flex; align-items: center; justify-content: center;
        }
        .fade-item.active { opacity: 1; }
        @keyframes glowText {
          0%, 100% { text-shadow: 0 0 15px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.3); }
          50% { text-shadow: 0 0 25px rgba(255,255,255,0.8), 0 0 50px rgba(255,255,255,0.6); }
        }
      `}</style>

      <div
        style={{
          background: bg,
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* ---------- TITLE ---------- */}
        <h1
          style={{
            color: '#fff',
            textAlign: 'center',
            fontWeight: 900,
            marginBottom: '2vh',
            textShadow: '0 0 20px rgba(0,0,0,0.7)',
            fontSize: 'clamp(2.2rem, 4vw, 5rem)',
          }}
        >
          {event.title || 'Fan Zone Wall'}
        </h1>

        {/* ---------- MAIN DISPLAY BOX ---------- */}
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
          {/* ---------- FADE POSTS ---------- */}
          <div className="fade-container">
            {posts.map((p, i) => (
              <div
                key={p.id}
                className={`fade-item ${i === current ? 'active' : ''}`}
              >
                {/* PHOTO LEFT SIDE */}
                <div
                  style={{
                    flexBasis: '45%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={p.photo_url || ''}
                    alt={displayName}
                    style={{
                      width: '85%',
                      height: 'auto',
                      borderRadius: 18,
                      objectFit: 'cover',
                      boxShadow: '0 0 25px rgba(0,0,0,0.7)',
                    }}
                  />
                </div>

                {/* RIGHT SIDE */}
                <div
                  style={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'translateY(-8%)',
                    textAlign: 'center',
                    color: '#fff',
                  }}
                >
                  {/* LOGO */}
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

                  {/* GREY BAR */}
                  <div
                    style={{
                      width: '92%',
                      height: 14,
                      borderRadius: 6,
                      background: 'linear-gradient(to right,#000,#444)',
                      boxShadow: '0 0 12px rgba(0,0,0,0.7)',
                      opacity: 0.85,
                      marginTop: '-2vh',
                      marginBottom: '2vh',
                    }}
                  ></div>

                  {/* NAME */}
                  <h2
                    style={{
                      fontWeight: 900,
                      fontSize: 'clamp(3rem, 4vw, 5rem)',
                      marginBottom: '1vh',
                      textShadow: '0 0 25px rgba(0,0,0,0.7)',
                      animation: 'glowText 2.5s ease-in-out infinite',
                    }}
                  >
                    {displayName}
                  </h2>

                  {/* MESSAGE */}
                  <p
                    style={{
                      fontSize: 'clamp(1.4rem, 2vw, 2.6rem)',
                      maxWidth: '65%',
                      lineHeight: 1.3,
                      textShadow: '0 0 10px rgba(0,0,0,0.6)',
                    }}
                  >
                    {p.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ---------- SMALL QR ---------- */}
          <div
            style={{
              position: 'absolute',
              bottom: 25,
              left: 25,
              width: 140,
              height: 140,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <QRCodeCanvas
              value={`https://faninteract.vercel.app/submit/${event.id}`}
              size={120}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
          </div>
        </div>
      </div>
    </>
  );
}
