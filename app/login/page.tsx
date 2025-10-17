'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { BRAND_LOGO, BRAND_NAME } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 🔍 Step 1: Look up email from hosts by username
      const { data: host, error: lookupError } = await supabase
        .from('hosts')
        .select('email')
        .eq('username', username)
        .single();

      if (lookupError || !host) throw new Error('Invalid username. Please check and try again.');

      // 🔐 Step 2: Sign in with email/password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: host.email,
        password,
      });
      if (signInError) throw signInError;

      // 🚀 Step 3: Redirect to dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden text-white text-center">
      {/* 🌌 Animated gradient background */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a2540,#1b2b44,#000000)] bg-[length:200%_200%] animate-gradient-slow" />
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_30%,rgba(0,153,255,0.4),transparent_70%)]" />

      {/* 🧭 Login card */}
      <div className="relative z-10 flex flex-col items-center px-6 py-10 rounded-2xl bg-[#0d1625]/90 border border-blue-900/40 shadow-lg shadow-black/40 max-w-sm w-full backdrop-blur-lg">
        {/* 🔵 Animated logo */}
        <motion.img
          src={BRAND_LOGO}
          alt={`${BRAND_NAME} Logo`}
          initial={{ scale: 0.95 }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[260px] md:w-[320px] mb-6 drop-shadow-[0_0_30px_rgba(56,189,248,0.3)]"
        />

        <h1 className="text-3xl font-bold mb-6 text-sky-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.2)]">
          {BRAND_NAME} Host Login
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col w-full gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="px-4 py-3 rounded-xl bg-[#111b2f] border border-blue-800/40 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 rounded-xl bg-[#111b2f] border border-blue-800/40 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 font-semibold shadow-lg shadow-blue-600/40 hover:scale-[1.03] hover:shadow-blue-500/60 transition-all duration-300"
          >
            {loading ? 'Signing In...' : 'Login'}
          </button>
        </form>

        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

        <p className="text-gray-400 text-sm mt-6">
          Don’t have an account?{' '}
          <a href="/signup" className="text-sky-400 hover:underline">
            Sign up
          </a>
        </p>
      </div>

      {/* 🎞️ Gradient Animation */}
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
