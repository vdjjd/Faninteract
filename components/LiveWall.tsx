'use client';

import { QRCodeCanvas } from 'qrcode.react';

export default function LiveWall({
  event,
  currentPost,
}: {
  event: any;
  currentPost: any;
}) {
  if (!event || !currentPost)
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '2rem',
          textAlign: 'center',
        }}
      >
        Waiting for approved post...
      </div>
    );

  const bg =
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value ||
        'linear-gradient(to bottom right,#1b2735,#090a0f)';

  return (
    <>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 10px rgba(255,255,255,0.3), 0 0 25px rgba(255,255,255,0.2); }
          50% { text-shadow: 0 0 25px rgba(255,255,255,0.7), 0 0 45px rgba(255,255,255,0.5); }
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
          <div
            style={{
              flexBasis: '45%',
              height: 'calc(100% - 40px)',
              marginLeft: '4vw',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={currentPost.image_url || '/faninteractlogo.png'}
              alt={currentPost.name || 'Guest Photo'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 16,
                boxShadow: '0 0 20px rgba(0,0,0,0.6)',
              }}
            />
          </div>

          {/* ---------- RIGHT SIDE ---------- */}
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
                marginBottom: '3vh',
              }}
            ></div>

            {/* ---------- NAME ---------- */}
            <h2
              style={{
                color: '#fff',
                fontWeight: 900,
                fontSize: 'clamp(3rem, 3.5vw, 4.5rem)',
                textShadow:
                  '0 0 25px rgba(255,255,255,0.7), 0 0 45px rgba(255,255,255,0.4)',
                textAlign: 'center',
                marginBottom: '1.5vh',
                animation: 'glowPulse 3s ease-in-out infinite',
              }}
            >
              {currentPost.name || 'Guest Name'}
            </h2>

            {/* ---------- MESSAGE ---------- */}
            <p
              style={{
                color: '#fff',
                fontSize: 'clamp(1.6rem, 2vw, 2.8rem)',
                lineHeight: 1.4,
                textShadow: '0 0 15px rgba(0,0,0,0.6)',
                textAlign: 'center',
                maxWidth: '80%',
              }}
            >
              {currentPost.message || ''}
            </p>
          </div>

          {/* ---------- SMALL QR (BOTTOM LEFT) ---------- */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              width: 110,
              height: 110,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <QRCodeCanvas
              value={`https://faninteract.vercel.app/submit/${event.id}`}
              size={90}
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
    </>
  );
}
