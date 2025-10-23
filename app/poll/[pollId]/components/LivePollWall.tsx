'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface LivePollWallProps {
  poll: any;
}

export default function LivePollWall({ poll }: LivePollWallProps) {
  const options = poll?.options || [];
  const totalVotes = options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0) || 1;

  const colorPresets = [
    '#0d6efd',
    '#dc3545',
    '#198754',
    '#ffc107',
    '#6610f2',
    '#fd7e14',
    '#20c997',
    '#6c757d',
  ];

  return (
    <div
      className="w-full h-screen flex flex-col justify-center items-center text-white relative overflow-hidden"
      style={{
        background:
          poll.background_type === 'image'
            ? `url(${poll.background_value}) center/cover no-repeat`
            : poll.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)',
      }}
    >
      <h1 className="text-4xl font-extrabold mb-6 drop-shadow-lg text-center">
        {poll.title || 'Live Fan Poll'}
      </h1>

      <div className="w-[80%] max-w-5xl flex flex-col gap-6 relative mt-6">
        {options.map((opt: any, i: number) => {
          const percent = Math.round(((opt.votes || 0) / totalVotes) * 100);
          const color = opt.color || colorPresets[i % colorPresets.length];

          return (
            <div key={opt.text + i} className="w-full">
              <div className="flex justify-between text-sm mb-1 px-1">
                <span className="font-semibold">{opt.text}</span>
                <span>{opt.votes || 0} votes</span>
              </div>

              <div className="relative w-full bg-white/15 rounded-full overflow-hidden h-10">
                <AnimatePresence>
                  <motion.div
                    key={opt.votes}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8 }}
                    style={{
                      height: '100%',
                      background: color,
                      backgroundImage: `repeating-linear-gradient(
                        45deg,
                        ${color} 0,
                        ${color} 10px,
                        rgba(255,255,255,0.2) 10px,
                        rgba(255,255,255,0.2) 20px
                      )`,
                      borderRadius: '9999px',
                    }}
                    className="flex items-center justify-center text-xs font-bold"
                  >
                    {percent > 5 && <span>{percent}%</span>}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen button */}
      <div
        className="fixed bottom-3 right-3 w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer z-50 opacity-20 hover:opacity-100 transition-all duration-300 bg-white/10 backdrop-blur-md border border-white/20"
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
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"
          />
        </svg>
      </div>
    </div>
  );
}