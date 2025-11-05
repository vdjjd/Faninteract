'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ------------------ Device ID Helper ------------------ */
function getOrCreateGuestDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('guest_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('guest_device_id', id);
  }
  return id;
}

export default function GuestSignupPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wallId = searchParams.get('wall');
  const redirect = `/wall/${wallId}/submit`;

  const [wallBG, setWallBG] = useState<{ type: string; value: string } | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ------------------ Auto-redirect if already signed up ------------------ */
  useEffect(() => {
    const profile = localStorage.getItem('guest_profile');
    if (profile) router.push(redirect);
  }, []);

  /* ------------------ Load wall background ------------------ */
  useEffect(() => {
    async function loadWall() {
      if (!wallId) return;
      const { data, error } = await supabase
        .from('fan_walls')
        .select('background_type, background_value')
        .eq('id', wallId)
        .single();

      if (!error && data) {
        setWallBG({ type: data.background_type, value: data.background_value });
      }
    }
    loadWall();
  }, [wallId]);

  /* ------------------ Handle Form Submit ------------------ */
  async function handleSubmit(e: any) {
    e.preventDefault();
    setError('');
    if (!agree) return setError('You must agree to the Terms.');
    setSubmitting(true);

    try {
      const device_id = getOrCreateGuestDeviceId();
      const { data: existing } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('device_id', device_id)
        .maybeSingle();

      let profile;
      if (existing) {
        const { data } = await supabase
          .from('guest_profiles')
          .update(form)
          .eq('device_id', device_id)
          .select()
          .single();
        profile = data;
      } else {
        const { data } = await supabase
          .from('guest_profiles')
          .insert([{ device_id, ...form }])
          .select()
          .single();
        profile = data;
      }

      localStorage.setItem('guest_profile', JSON.stringify(profile));
      router.push(redirect);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------ Determine background style ------------------ */
  const bgStyle =
    wallBG?.type === 'image'
      ? {
          backgroundImage: `url(${wallBG.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {
          background: wallBG?.value || 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
        };

  return (
    <main
      className={cn('relative', 'flex', 'items-center', 'justify-center', 'min-h-screen', 'w-full', 'overflow-hidden')}
      style={bgStyle}
    >
      {/* Dim/blur overlay */}
      <div className={cn('absolute', 'inset-0', 'bg-black/60', 'backdrop-blur-sm')}></div>

      {/* Signup box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "relative z-10 w-[90%] max-w-md rounded-3xl p-7",
          "bg-white/10 border border-white/20 backdrop-blur-xl shadow-[0_0_30px_rgba(56,189,248,0.3)]"
        )}
      >
        {/* Logo */}
        <div className={cn('flex', 'justify-center', 'mb-4')}>
          <Image
            src="/faninteractlogo.png"
            alt="FanInteract"
            width={260}
            height={100}
            className="drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]"
          />
        </div>

        {/* Pulse header */}
        <motion.h2
          animate={{
            textShadow: [
              "0 0 8px rgba(56,189,248,0.8)",
              "0 0 18px rgba(56,189,248,0.7)",
              "0 0 8px rgba(56,189,248,0.8)",
            ],
            scale: [1, 1.03, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={cn('text-center', 'text-xl', 'font-semibold', 'text-sky-200', 'mb-4')}
        >
          Join the Fan Zone!
        </motion.h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {["first_name", "last_name", "email", "phone"].map((field) => (
            <input
              key={field}
              name={field}
              type={field === "email" ? "email" : "text"}
              placeholder={
                field === "first_name"
                  ? "First Name *"
                  : field === "last_name"
                  ? "Last Name *"
                  : field === "email"
                  ? "Email (optional)"
                  : "Phone (optional)"
              }
              required={field === "first_name" || field === "last_name"}
              className={cn('w-full', 'p-3', 'rounded-xl', 'bg-black/40', 'border', 'border-white/30', 'focus:border-sky-400', 'outline-none', 'text-white')}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          ))}

          <label className={cn('flex', 'items-center', 'gap-2', 'text-xs', 'text-gray-300')}>
            <input
              type="checkbox"
              className={cn('accent-sky-500', 'w-4', 'h-4')}
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            I agree to the <a href="/terms" target="_blank" className={cn('text-sky-300', 'underline')}>Terms</a>
          </label>

          <button className={cn('w-full', 'py-3', 'rounded-xl', 'bg-gradient-to-r', 'from-sky-500', 'to-blue-600', 'font-semibold', 'shadow-lg', 'hover:scale-[1.02]', 'active:scale-[0.98]', 'transition-all')}>
            {submitting ? "Submitting..." : "Enter Fan Zone"}
          </button>

          {error && <p className={cn('text-red-300', 'text-center', 'text-sm')}>{error}</p>}
        </form>
      </motion.div>
    </main>
  );
}
