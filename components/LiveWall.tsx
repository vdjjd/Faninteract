'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';

/* ---------- TYPES ---------- */
interface EventData {
  id: string;
  title: string | null;
  background_type: 'gradient' | 'solid' | 'image' | null;
  background_value: string | null;
  logo_url: string | null;
}

interface SubmissionData {
  id: string;
  name: string | null;
  message: string | null;
  image_url: string | null;
  created_at: string;
}

/* ---------- LIVE WALL ---------- */
export default function LiveWall({
  event,
  posts,
}: {
  event: EventData;
  posts: SubmissionData[];
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!posts.length) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % posts.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [posts]);

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  if (!posts.length)
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: bg,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
          fontSize: '2vw',
        }}
      >
        Waiting for approved posts…
      </div>
    );

  const post = posts[current];

  return (
    <>
      <style>{`
        .fade-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .fade-item {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          opacity: 0;
          transition: opacity 1.2s ease-in-out;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .fade-item.active { opacity: 1; }
      `}</style>

      <div
        style={{
          background: bg,
          width: '100%',
          height: '100%',
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
            marginTop: '4vh',
            marginBottom: '2vh',
            fontSize: 'clamp(2.2rem, 4vw, 5rem)',
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
          }}
        >
          <div className="fade-container">
            {posts.map((p, i) => (
              <div
                key={p.id}
                className={`fade-item ${i === current ? 'active' : ''}`}
              >
                {/* ---------- GUEST PHOTO (LEFT) ---------- */}
                <div
                  style={{
                    position: 'absolute',
                    left: 40,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 260,
                    height: 260,
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 0 25px rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: '#000',
                  }}
                >
                  <img
                    src={p.image_url || ''}
                    alt={p.name || ''}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>

                {/* ---------- GREY BAR ---------- */}
                <div
                  style={{
                    position: 'absolute',
                    left: '45%',
                    right: '10%',
                    height: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderRadius: 6,
                    background: 'linear-gradient(to right,#000,#444)',
                    boxShadow: '0 0 10px rgba(0,0,0,0.6)',
                    opacity: 0.8,
                  }}
                ></div>

                {/* ---------- LOGO ABOVE BAR ---------- */}
                <div
                  style={{
                    position: 'absolute',
                    top: '35%',
                    right: '10%',
                    transform: 'translateY(-50%)',
                    width: 'clamp(180px, 20vw, 320px)',
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

                {/* ---------- NAME & MESSAGE (CENTERED BELOW BAR) ---------- */}
                <div
                  style={{
                    position: 'absolute',
                    top: '65%',
                    left: '70%',
                    transform: 'translate(-50%, 0)',
                    textAlign: 'center',
                    color: '#fff',
                    width: '55%',
                  }}
                >
                  <h2
                    style={{
                      fontWeight: 900,
                      fontSize: 'clamp(2.5rem, 3.5vw, 5rem)',
                      textShadow: '0 0 25px rgba(0,0,0,0.7)',
                      marginBottom: '1vh',
                    }}
                  >
                    {p.name}
                  </h2>
                  <p
                    style={{
                      fontSize: 'clamp(1.6rem, 2vw, 3rem)',
                      fontWeight: 600,
                      textShadow: '0 0 20px rgba(0,0,0,0.7)',
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {p.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ---------- SMALL QR (BOTTOM LEFT) ---------- */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              width: 120,
              height: 120,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <QRCodeCanvas
              value={`https://faninteract.vercel.app/submit/${event.id}`}
              size={100}
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
