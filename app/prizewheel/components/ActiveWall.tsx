'use client';

export default function ActiveWall({ wheel }: { wheel: any }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center h-screen text-white text-center"
      style={{
        background:
          wheel.background_value ||
          'linear-gradient(135deg,#0d47a1,#1976d2)',
      }}
    >
      {/* Main Title */}
      <h1 className="text-5xl font-extrabold drop-shadow-lg mb-4">
        🎡 {wheel.title || 'Active Prize Wheel'}
      </h1>

      {/* QR Placeholder (future feature) */}
      <div className="absolute bottom-10 left-10 bg-black/50 p-4 rounded-xl">
        <p className="text-sm">📲 QR Code Area</p>
      </div>

      {/* Status */}
      <p className="text-lg text-white/70 italic mt-4">
        Status: <span className="text-green-400">{wheel.status}</span>
      </p>
    </div>
  );
}
