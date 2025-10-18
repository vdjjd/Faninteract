'use client';

import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';

interface SubmissionData {
  id: string;
  name: string | null;
  message: string | null;
  image_url: string | null;
  created_at: string;
}

export default function LiveWall({ event }: { event: any }) {
  const [posts, setPosts] = useState<SubmissionData[]>([]);
  const [current, setCurrent] = useState(0);

  /* ---------- LOAD APPROVED POSTS ---------- */
  useEffect(() => {
    async function loadPosts() {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', event.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });
      if (data) setPosts(data);
    }
    loadPosts();

    const sub = supabase
      .channel('public:submissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `event_id=eq.${event.id}` },
        (payload) => {
          const updated = payload.new as SubmissionData;
          if (updated.status === 'approved') {
            setPosts((prev) => {
              const exists = prev.find((p) => p.id === updated.id);
              if (exists) {
                return prev.map((p) => (p.id === updated.id ? updated : p));
              }
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [event.id]);

  /* ---------- FADE CYCLING ---------- */
  useEffect(() => {
    if (posts.length === 0) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % posts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [posts]);

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  const currentPost = posts[current];

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
      `}</style>

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
          {/* ---------- LEFT: GUEST PHOTO ---------- */}
          {posts.length > 0 && (
            <div className="fade-container" style={{ flexBasis: '45%' }}>
              {posts.map((p, i) => (
                <div key={p.id} className={`fade-item ${i === current ? 'active' : ''}`}>
                  <img
                    src={p.image_url || ''}
                    alt={p.name || ''}
                    style={{
                      width: '90%',
                      height: 'auto',
                      maxHeight: '65%',
                      borderRadius: 16,
                      objectFit: 'cover',
                      boxShadow: '0 0 20px rgba(0,0,0,0.6)',
                    }}
                  />
                </div>
              ))}
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
              transform: 'translateY(-4%)',
            }}
          >
            {/* ---------- LOGO ---------- */}
            <div style={{ width: 'clamp(240px, 24vw, 360px)', marginBottom: '1vh' }}>
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
                width: '90%',
                height: 12,
                borderRadius: 6,
                background: 'linear-gradient(to right,#000,#444)',
                boxShadow: '0 0 10px rgba(0,0,0,0.6)',
                opacity: 0.8,
                marginBottom: '3vh',
              }}
            ></div>

            {/* ---------- NAME & MESSAGE ---------- */}
            {posts.length > 0 && currentPost && (
              <div
                className="fade-container"
                style={{
                  textAlign: 'center',
                  color: '#fff',
                }}
              >
                {posts.map((p, i) => (
                  <div key={p.id} className={`fade-item ${i === current ? 'active' : ''}`}>
                    <h2
                      style={{
                        fontWeight: 900,
                        fontSize: 'clamp(2rem, 3vw, 4rem)',
                        textShadow: '0 0 20px rgba(0,0,0,0.8)',
                        marginBottom: '1vh',
                      }}
                    >
                      {p.name}
                    </h2>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: 'clamp(1.4rem, 2vw, 2.8rem)',
                        textShadow: '0 0 12px rgba(0,0,0,0.6)',
                        maxWidth: '70%',
                        margin: '0 auto',
                      }}
                    >
                      {p.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- SMALL QR ---------- */}
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
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: 26, height: 26 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
          </svg>
        </div>
      </div>
    </>
  );
}
