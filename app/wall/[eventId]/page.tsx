'use client';

import { useParams } from 'next/navigation';
import { useWallData } from './hooks/useWallData';

/* ✅ UPDATED IMPORT PATHS */
import InactiveWall from '@/app/wall/components/wall/InactiveWall';
import SingleHighlightWall from '@/app/wall/components/wall/layouts/SingleHighlightWall';
import Grid2x2Wall from '@/app/wall/components/wall/layouts/Grid2x2Wall';
import Grid4x2Wall from '@/app/wall/components/wall/layouts/Grid4x2Wall';

/* ---------- MAIN PAGE ---------- */
export default function FanWallPage() {
  const { eventId } = useParams();
  const { event, submissions, loading, showLive } = useWallData(eventId);

  /* ---------- BACKGROUND FIX ---------- */
  let bg = 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  if (event?.background_type === 'image' && event?.background_value) {
    bg = `url(${event.background_value}) center/cover no-repeat`;
  } else if (event?.background_type === 'gradient' && event?.background_value) {
    bg = event.background_value;
  } else if (event?.background_type === 'solid' && event?.background_value) {
    bg = event.background_value;
  }

  /* ---------- LOADING ---------- */
  if (loading)
    return <p className="text-white text-center mt-20">Loading Wall …</p>;
  if (!event)
    return <p className="text-white text-center mt-20">Event not found.</p>;

  /* ---------- RENDER ---------- */
  return (
    <>
      <style>{`
        .fade-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          background: ${bg};
          overflow: hidden;
          transition: background 0.6s ease-in-out;
        }
        .fade-child {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }
        .fade-child.active {
          opacity: 1;
          z-index: 2;
        }
      `}</style>

      <div className="fade-wrapper">
        {/* ---------- INACTIVE WALL ---------- */}
        <div
          className={`fade-child ${
            !showLive || event?.countdown_active ? 'active' : ''
          }`}
        >
          <InactiveWall event={event} />
        </div>

        {/* ---------- LIVE WALL ---------- */}
        <div
          className={`fade-child ${
            showLive && !event?.countdown_active ? 'active' : ''
          }`}
        >
          {event.layout_type === '2 Column × 2 Row' ? (
            <Grid2x2Wall event={event} posts={submissions} />
          ) : event.layout_type === '4 Column × 2 Row' ? (
            <Grid4x2Wall event={event} posts={submissions} />
          ) : (
            <SingleHighlightWall event={event} posts={submissions} />
          )}
        </div>
      </div>
    </>
  );
}