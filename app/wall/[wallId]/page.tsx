'use client';

import { useParams } from 'next/navigation';
import { useWallData } from '@/app/wall/hooks/useWallData';

/* ✅ IMPORT WALL COMPONENTS */
import InactiveWall from '@/app/wall/components/wall/InactiveWall';
import SingleHighlightWall from '@/app/wall/components/wall/layouts/SingleHighlightWall';
import Grid2x2Wall from '@/app/wall/components/wall/layouts/Grid2x2Wall';
import Grid4x2Wall from '@/app/wall/components/wall/layouts/Grid4x2Wall';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* 🧱 MAIN FAN WALL PAGE                                                     */
/* -------------------------------------------------------------------------- */
export default function FanWallPage() {
  const { wallId } = useParams();
  const wallUUID = Array.isArray(wallId) ? wallId[0] : wallId;

  // ✅ Pull wall + post data from custom hook
  const { wall, posts, loading, showLive } = useWallData(wallUUID);

  /* ---------------------------------------------------------------------- */
  /* 🎨 DETERMINE BACKGROUND                                               */
  /* ---------------------------------------------------------------------- */
  let bg = 'linear-gradient(to bottom right,#1b2735,#090a0f)';

  if (wall?.background_type === 'image' && wall?.background_value) {
    bg = `url(${wall.background_value}) center/cover no-repeat`;
  } else if (wall?.background_type === 'gradient' && wall?.background_value) {
    bg = wall.background_value;
  } else if (wall?.background_type === 'solid' && wall?.background_value) {
    bg = wall.background_value;
  }

  /* ---------------------------------------------------------------------- */
  /* 🕓 LOADING + ERROR HANDLING                                           */
  /* ---------------------------------------------------------------------- */
  if (loading)
    return <p className={cn('text-white text-center mt-20')}>Loading Fan Wall…</p>;

  if (!wall)
    return <p className={cn('text-white text-center mt-20')}>Wall not found.</p>;

  /* ---------------------------------------------------------------------- */
  /* 🧩 RENDER WALL                                                        */
  /* ---------------------------------------------------------------------- */
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
            !showLive || wall?.countdown_active ? 'active' : ''
          }`}
        >
          <InactiveWall event={wall} />
        </div>

        {/* ---------- LIVE WALL ---------- */}
        <div
          className={`fade-child ${
            showLive && !wall?.countdown_active ? 'active' : ''
          }`}
        >
          {wall.layout_type === '2 Column × 2 Row' ? (
            <Grid2x2Wall event={wall} posts={posts} />
          ) : wall.layout_type === '4 Column × 2 Row' ? (
            <Grid4x2Wall event={wall} posts={posts} />
          ) : (
            <SingleHighlightWall event={wall} posts={posts} />
          )}
        </div>
      </div>
    </>
  );
}
