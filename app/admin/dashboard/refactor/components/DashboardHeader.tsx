'use client';

export default function DashboardHeader({
  onCreateFanWall,
  onCreatePoll,
}: {
  onCreateFanWall: () => void;
  onCreatePoll: () => void;
}) {
  return (
    <div className="text-center mb-6">
      <img
        src="/faninteractlogo.png"
        alt="FanInteract Logo"
        className="w-44 animate-pulse mb-2 drop-shadow-lg mx-auto"
      />
      <h1 className="text-2xl font-bold mb-4">🎛 Host Dashboard</h1>

      <div className="flex justify-center gap-4">
        <button
          onClick={onCreateFanWall}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
        >
          ➕ New Fan Zone Wall
        </button>
        <button
          onClick={onCreatePoll}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
        >
          📊 New Live Poll Wall
        </button>
      </div>
    </div>
  );
}
