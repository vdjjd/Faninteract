'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden text-white text-center">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a2540,#1b2b44,#000000)] bg-[length:200%_200%] animate-gradient-slow" />
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_30%,rgba(0,153,255,0.4),transparent_70%)]" />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center h-screen w-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center justify-center space-y-8"
        >
          <Image
            src="/faninteractlogo.svg"
            alt="FanInteract Logo"
            width={240}
            height={240}
            className="w-56 h-auto drop-shadow-[0_0_25px_rgba(56,189,248,0.3)]"
            priority
          />

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-400">
            Turn Crowds Into Communities
          </h1>

          <p className="text-lg md:text-2xl text-gray-300 max-w-2xl">
            FanInteract lets your audience post, vote, and play live — all on one wall.
          </p>

          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl font-semibold shadow-lg shadow-blue-600/40 hover:scale-105 hover:shadow-blue-500/60 transition-all duration-300"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 border border-sky-400 text-sky-400 hover:bg-sky-400/10 rounded-2xl font-semibold transition-all duration-300"
            >
              Login
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <section className="relative z-10 w-full py-28 bg-[#0d1625]/80 backdrop-blur-xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-14 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-sky-400">
          Built For Live Engagement
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">
          {[
            {
              title: '🎉 Fan Wall',
              desc: 'Real-time audience posts and shoutouts appear live on your LED wall.',
            },
            {
              title: '🧠 Trivia (Coming Soon)',
              desc: 'Interactive games that challenge your audience live on screen.',
            },
            {
              title: '📊 Polling (Coming Soon)',
              desc: 'Instant audience feedback with visual results in seconds.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-gradient-to-br from-[#111b2f] to-[#0c1320] border border-blue-900/40 shadow-lg shadow-black/40 hover:shadow-blue-600/30 hover:scale-[1.03] transition-all duration-300"
            >
              <h3 className="text-2xl font-semibold mb-3 text-blue-400">{item.title}</h3>
              <p className="text-gray-300 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full py-10 text-center bg-[#0b111d] border-t border-blue-900/40">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} FanInteract. All rights reserved.
        </p>
      </footer>

      {/* Gradient Animation */}
      <style jsx global>{`
        @keyframes gradient-slow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-slow 20s ease infinite;
        }
      `}</style>
    </main>
  );
}
