'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { cn } from "../lib/utils";

export default function ChangeEmailModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSubmit() {
    if (!email.includes('@')) {
      setMsg('❌ Please enter a valid email.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);

    if (error) setMsg(`❌ ${error.message}`);
    else setMsg('✅ Email updated successfully.');
  }

  return (
    <div className={cn('p-4', 'space-y-4', 'text-white', 'bg-black/80', 'rounded-lg', 'border', 'border-gray-700', 'shadow-lg')}>
      <h2 className={cn('text-lg', 'font-semibold')}>Change Email</h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={cn('w-full', 'bg-gray-800', 'border', 'border-gray-600', 'rounded', 'p-2', 'text-white')}
        placeholder="New email"
      />

      <div className={cn('flex', 'flex-col', 'gap-2')}>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Updating…' : 'Update Email'}
        </Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {msg && <p className={cn('text-sm', 'text-gray-400')}>{msg}</p>}
    </div>
  );
}
