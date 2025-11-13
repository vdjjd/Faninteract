'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIG — CINEMATIC MODE (max visual impact)                             */
/* -------------------------------------------------------------------------- */
const CONFIG = {
  MAX_BARS: 8,
  POLL_INTERVAL_MS: 3000,
  ANIMATION_SPEED_MS: 1200,
  BAR_WIDTH_PERCENT: 10.5,
  BAR_RADIUS_PX: 5,
  BAR_SHADOW: '0 0 40px rgba(0,0,0,0.8)',
  VOTE_TEXT_GLOW: '0 0 25px rgba(255,255,255,0.95)',
  VOTE_TEXT_STROKE: 'black',
  VOTE_TEXT_STROKE_WIDTH: 2.3,
  BAR_MAX_HEIGHT_PCT: 90,

  /* FROSTED */
  FROST_WIDTH_VW: 90,
  FROST_HEIGHT_VH: 78,

  /* BAR GROUP POSITIONING */
  BAR_GROUP_LEFT_VW: 11.5,
  BAR_GROUP_WIDTH_VW: 77.6,
  BAR_GROUP_TOP_VH: 0,
  BAR_GROUP_HEIGHT_VH: 78,

  /* LABEL POSITIONING */
  LABEL_TOP_OFFSET_VH: 0,
  LABEL_LEFT_VW: 11,
  LABEL_WIDTH_VW: 77.6,
  LABEL_HEIGHT_VH: 7.5,

  CURVE_POWER: 0.6,
};

/* -------------------------------------------------------------------------- */
/* ACTIVE POLL WALL                                                           */
/* -------------------------------------------------------------------------- */
export default function ActivePollWall({ poll }) {
  const rt = useRealtimeChannel();
  const fullscreenButtonRef = useRef(null);

  const [options, setOptions] = useState<any[]>([]);
  const [animatedVotes, setAnimatedVotes] = useState<number[]>([]);
  const [bg, setBg] = useState('linear-gradient(to bottom right,#1b2735,#090a0f)');
  const [brightness, setBrightness] = useState(poll?.background_brightness || 100);
  const [title, setTitle] = useState(poll?.question || 'Active Poll');

  /* Load poll options */
  async function loadOptions() {
    const { data } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', poll.id)
      .limit(CONFIG.MAX_BARS)
      .order('option_text', { ascending: true });

    if (data) setOptions(data);
  }

  useEffect(() => {
    if (poll?.id) loadOptions();
    const interval = setInterval(loadOptions, CONFIG.POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll?.id]);

  /* Animate */
  useEffect(() => {
    if (!options.length) return;
    setAnimatedVotes((prev) =>
      options.map((opt, i) => {
        const oldVal = prev[i] ?? 0;
        const diff = opt.vote_count - oldVal;
        return oldVal + diff * 0.4;
      })
    );
  }, [options]);

  /* Background */
  useEffect(() => {
    if (!poll) return;
    setTitle(poll.question || 'Active Poll');

    const value =
      poll.background_type === 'image'
        ? `url(${poll.background_value}) center/cover no-repeat`
        : poll.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)';

    setBg(value);
    if (poll.background_brightness !== undefined) setBrightness(poll.background_brightness);
  }, [poll]);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://faninteract.vercel.app';

  const qrValue = `${origin}/guest/signup?redirect=/polls/${poll?.id}/vote`;
  const logo = poll?.host?.branding_logo_url?.trim() || '/faninteractlogo.png';

  const toggleFullscreen = () =>
    !document.fullscreenElement
      ? document.documentElement.requestFullscreen().catch(() => {})
      : document.exitFullscreen();

  /* Vote scaling */
  const curvedVotes = animatedVotes.map((v) => Math.pow(v || 0, CONFIG.CURVE_POWER));
  const maxCurved = Math.max(...curvedVotes, 1);

  return (
    <div
      style={{
        background: bg,
        filter: `brightness(${brightness}%)`,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        paddingTop: '3vh',
      }}
    >
      {/* TITLE */}
      <h1
        style={{
          color: '#fff',
          fontSize: 'clamp(2.5rem,3vw,5rem)',
          fontWeight: 900,
          marginBottom: '1vh',
          textShadow:
            '2px 2px 4px #000, -2px 2px 4px #000, 2px -2px 4px #000, -2px -2px 4px #000',
        }}
      >
        {title}
      </h1>

      {/* FROSTED BOX */}
      <div
        style={{
          width: `${CONFIG.FROST_WIDTH_VW}vw`,
          height: `${CONFIG.FROST_HEIGHT_VH}vh`,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* BAR GROUP OUTLINE — REMOVED RED BORDER */}
        <div
          style={{
            position: 'absolute',
            top: `${CONFIG.BAR_GROUP_TOP_VH}vh`,
            left: `${CONFIG.BAR_GROUP_LEFT_VW}vw`,
            width: `${CONFIG.BAR_GROUP_WIDTH_VW}vw`,
            height: `${CONFIG.BAR_GROUP_HEIGHT_VH}vh`,
            border: 'none',      /* ← FIXED */
            borderRadius: 12,
            pointerEvents: 'none',
          }}
        />

        {/* BARS */}
        <div
          style={{
            position: 'absolute',
            top: `${CONFIG.BAR_GROUP_TOP_VH}vh`,
            left: `${CONFIG.BAR_GROUP_LEFT_VW}vw`,
            width: `${CONFIG.BAR_GROUP_WIDTH_VW}vw`,
            height: `${CONFIG.BAR_GROUP_HEIGHT_VH}vh`,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          {options.map((opt, i) => {
            const curved = curvedVotes[i];
            const percent = (curved / maxCurved) * CONFIG.BAR_MAX_HEIGHT_PCT;

            return (
              <div
                key={opt.id}
                style={{
                  width: `${CONFIG.BAR_WIDTH_PERCENT}%`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 'clamp(1rem,1.6vw,2rem)',
                    textShadow: CONFIG.VOTE_TEXT_GLOW,
                    WebkitTextStroke: `${CONFIG.VOTE_TEXT_STROKE_WIDTH}px ${CONFIG.VOTE_TEXT_STROKE}`,
                    marginBottom: '0.6vh',
                    transition: `all ${CONFIG.ANIMATION_SPEED_MS}ms ease-in-out`,
                  }}
                >
                  {Math.round(animatedVotes[i] ?? 0)}
                </div>

                <div
                  style={{
                    width: '100%',
                    height: `${percent}%`,
                    background: opt.bar_color || '#1e88e5',
                    borderRadius: CONFIG.BAR_RADIUS_PX,
                    boxShadow: CONFIG.BAR_SHADOW,
                    transition: `height ${CONFIG.ANIMATION_SPEED_MS}ms ease-in-out`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* QR */}
        <div
          style={{
            position: 'absolute',
            bottom: '-0.5vh',
            left: '-0.5vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <p
            style={{
              color: '#fff',
              fontWeight: 700,
              marginBottom: '0.3vh',
              fontSize: 'clamp(1rem,1.4vw,1.4rem)',
            }}
          >
            Scan To Vote
          </p>

          <div
            style={{
              padding: 2,
              borderRadius: 30,
              background: 'rgba(255,255,255,0.08)',
              boxShadow:
                '0 0 25px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.3)',
            }}
          >
            <QRCodeCanvas
              value={qrValue}
              size={160}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              style={{ borderRadius: 20 }}
            />
          </div>
        </div>

        {/* LOGO */}
        <div
          style={{
            position: 'absolute',
            top: '54%',
            right: '85.5%',
            width: 'clamp(150px,16vw,260px)',
          }}
        >
          <img
            src={logo}
            style={{
              width: '100%',
              height: 'auto',
              filter: 'drop-shadow(0 0 14px rgba(0,0,0,0.85))',
            }}
          />
        </div>
      </div>

      {/* LABEL CONTAINER — RED BORDER REMOVED */}
      <div
        style={{
          marginTop: `${CONFIG.LABEL_TOP_OFFSET_VH}vh`,
          marginLeft: `${CONFIG.LABEL_LEFT_VW}vw`,
          width: `${CONFIG.LABEL_WIDTH_VW}vw`,
          height: `${CONFIG.LABEL_HEIGHT_VH}vh`,
          border: 'none',        /* ← FIXED */
          borderRadius: 12,
          position: 'relative',
        }}
      >
        {options.map((opt, i) => {
          const totalBars = options.length;
          const barWidth = CONFIG.BAR_WIDTH_PERCENT;
          const gap = (100 - totalBars * barWidth) / (totalBars - 1);
          const leftOffset = i * (barWidth + gap);

          return (
            <div
              key={opt.id}
              style={{
                position: 'absolute',
                left: `${leftOffset}%`,
                width: `${barWidth}%`,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 'clamp(1rem,1.2vw,1.6rem)',
                }}
              >
                {opt.option_text}
              </p>
            </div>
          );
        })}
      </div>

      {/* FULLSCREEN BUTTON */}
      <div
        ref={fullscreenButtonRef}
        style={{
          position: 'absolute',
          bottom: 'calc(1.5vh + 1.5%)',
          right: 'calc(1.5vw + 1.5%)',
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.15,
          transition: 'opacity 0.2s ease',
          zIndex: 50,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
        onClick={toggleFullscreen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          stroke="white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          style={{ width: 28, height: 28 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5" />
        </svg>
      </div>
    </div>
  );
}
