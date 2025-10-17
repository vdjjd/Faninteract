'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0b111d] text-white">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2540] via-[#1b2b44] to-[#000000] animate-gradient-slow" />

      {/* Floating light layer */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,rgba(0,153,255,0.3),transparent_70%)]" />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center min-h-screen px-6">
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-400">
            Engage Every Fan.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-xl md:text-2xl text-gray-300 max-w-2xl mb-12"
        >
          FanInteract turns your audience into part of the show — Live Fan Walls, Trivia, and Polling.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="flex flex-wrap justify-center gap-6"
        >
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
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-28 text-center bg-[#0d1625]/70 backdrop-blur-xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-14 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-sky-400">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">
          {[
            {
              title: 'Scan the QR',
              desc: 'Fans instantly join your live wall — no downloads, no hassle.',
            },
            {
              title: 'Share & Vote',
              desc: 'Posts, reactions, trivia, and polls appear on screen in real time.',
            },
            {
              title: 'You Run the Show',
              desc: 'Control the vibe with moderation tools and real-time updates.',
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

      {/* Features */}
      <section className="relative z-10 py-28 bg-[#0b111d] text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-14 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-sky-400">
          FanInteract Experiences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">
          {[
            {
              title: '🎉 Fan Wall',
              desc: 'Turn your crowd into content — every moment, every reaction, live on screen.',
            },
            {
              title: '🧠 Trivia (Coming Soon)',
              desc: 'Challenge your audience with interactive, real-time trivia built into your event.',
            },
            {
              title: '📊 Polling (Coming Soon)',
              desc: 'Get instant audience insights with live visual polls and feedback loops.',
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
      <footer className="relative z-10 py-16 text-center bg-gradient-to-b from-[#0b111d] to-black border-t border-blue-900/40">
        <h2 className="text-2xl font-semibold mb-6 text-blue-400">Ready to Engage Your Crowd?</h2>
        <div className="flex justify-center gap-4 mb-8">
          <Link
            href="/auth/signup"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/30"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 border border-blue-500 hover:bg-blue-500/10 rounded-xl font-semibold transition-all duration-300"
          >
            Login
          </Link>
        </div>
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} FanInteract. All rights reserved.
        </p>
      </footer>

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
          animation: gradient-slow 15s ease infinite;
        }
      `}</style>
    </main>
  );
}
