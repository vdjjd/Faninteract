'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { cn } from "../lib/utils";

// ✅ Use RELATIVE import — fixes "module not found"
const SignUpPage = dynamic(() => import('./signup/page'), { ssr: false });

export default function LandingPage() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <main
      className={cn(
        'relative',
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'min-h-screen',
        'w-full',
        'overflow-hidden',
        'text-white',
        'text-center'
      )}
    >
      {/* 🌌 Animated gradient background */}
      <div
        className={cn(
          'absolute',
          'inset-0',
          'bg-[linear-gradient(135deg,#0a2540,#1b2b44,#000000)]',
          'bg-[length:200%_200%]',
          'animate-gradient-slow'
        )}
      />
      <div
        className={cn(
          'absolute',
          'inset-0',
          'opacity-25',
          'bg-[radial-gradient(circle_at_30%_30%,rgba(0,153,255,0.4),transparent_70%)]'
        )}
      />

      {/* 🎯 Hero Section */}
      <div className={cn('relative', 'z-10', 'flex', 'flex-col', 'items-center', 'justify-center', 'h-screen', 'w-full', 'px-6')}>
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'space-y-12', 'mt-[-60px]')}
        >
          {/* ✅ Logo */}
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/faninteractlogo.png"
              alt="FanInteract Logo"
              width={420}
              height={180}
              className={cn('w-[300px]', 'md:w-[420px]', 'h-auto', 'object-contain', 'drop-shadow-[0_0_30px_rgba(56,189,248,0.3)]')}
              priority
              unoptimized
            />
          </motion.div>

          <h1
            className={cn(
              'text-5xl',
              'md:text-7xl',
              'font-extrabold',
              'tracking-tight',
              'bg-clip-text',
              'text-transparent',
              'bg-gradient-to-r',
              'from-sky-400',
              'via-blue-500',
              'to-indigo-400',
              'drop-shadow-[0_0_30px_rgba(56,189,248,0.25)]'
            )}
          >
            Turn Crowds Into Communities
          </h1>

          <p className={cn('text-lg', 'md:text-2xl', 'text-gray-300', 'max-w-2xl', 'leading-relaxed')}>
            FanInteract lets your audience post, vote, and play live — all on one wall.
          </p>

          <div className={cn('flex', 'flex-wrap', 'justify-center', 'gap-6', 'pt-4')}>
            <button
              onClick={() => setShowSignup(true)}
              className={cn(
                'px-8',
                'py-4',
                'bg-gradient-to-r',
                'from-sky-500',
                'to-blue-600',
                'rounded-2xl',
                'font-semibold',
                'shadow-lg',
                'shadow-blue-600/40',
                'hover:scale-105',
                'hover:shadow-blue-500/60',
                'transition-all',
                'duration-300'
              )}
            >
              Get Started
            </button>

            <Link
              href="/login"
              className={cn(
                'px-8',
                'py-4',
                'border',
                'border-sky-400',
                'text-sky-400',
                'hover:bg-sky-400/10',
                'rounded-2xl',
                'font-semibold',
                'transition-all',
                'duration-300'
              )}
            >
              Login
            </Link>
          </div>
        </motion.div>
      </div>

      {/* 🧩 Signup Modal — renders your real signup page */}
      <Modal isOpen={showSignup} onClose={() => setShowSignup(false)}>
        <SignUpPage />
      </Modal>

      {/* 🦶 Footer */}
      <footer
        className={cn(
          'relative',
          'z-10',
          'w-full',
          'py-10',
          'text-center',
          'bg-[#0b111d]',
          'border-t',
          'border-blue-900/40'
        )}
      >
        <p className={cn('text-gray-500', 'text-sm')}>
          © {new Date().getFullYear()} FanInteract. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
