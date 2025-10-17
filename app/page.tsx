'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0a0f1a] text-white">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center h-screen text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-600"
        >
          Turn Crowds Into Communities
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="max-w-2xl text-lg md:text-xl text-gray-300 mb-10"
        >
          FanInteract brings your audience to life — posts, polls, and trivia on one live wall.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="flex gap-4"
        >
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
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-b from-transparent to-[#111827]/70 text-center px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-semibold mb-12"
        >
          How It Works
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              title: 'Scan the QR Code',
              desc: 'Fans instantly join your event wall by scanning a unique QR code.',
            },
            {
              title: 'Post, Vote, or Play',
              desc: 'Users share photos, shoutouts, or answers — live on screen.',
            },
            {
              title: 'You Control It',
              desc: 'Approve, moderate, and highlight posts in real-time.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-[#1e293b]/60 hover:bg-[#1e293b]/80 transition-colors duration-300 backdrop-blur-md shadow-lg shadow-blue-900/20"
            >
              <h3 className="text-2xl font-bold mb-3 text-blue-400">{item.title}</h3>
              <p className="text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 text-center px-6 bg-[#0f172a]/60 backdrop-blur-sm">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-semibold mb-12"
        >
          Engage Every Fan
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              title: 'Fan Wall',
              desc: 'Real-time audience interaction displayed on your LED wall.',
            },
            {
              title: 'Trivia (Coming Soon)',
              desc: 'Interactive games that let fans compete live on screen.',
            },
            {
              title: 'Polling (Coming Soon)',
              desc: 'Instant audience feedback with results shown in real-time.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-[#1e293b]/60 hover:bg-[#1e293b]/80 transition-colors duration-300 backdrop-blur-md shadow-lg shadow-blue-900/20"
            >
              <h3 className="text-2xl font-bold mb-3 text-blue-400">{item.title}</h3>
              <p className="text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-16 text-center bg-[#0a0f1a] border-t border-blue-900/40">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-2xl md:text-4xl font-semibold mb-6 text-blue-400"
        >
          Ready to Engage Your Crowd?
        </motion.h2>
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
    </main>
  );
}
