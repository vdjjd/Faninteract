'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

export default function ChangeEmailModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSubmit() {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg('✅ Email updated – check your inbox to confirm.');
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Change Email</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
        placeholder="New email"
      />
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Updating…' : 'Update Email'}
      </Button>
      {msg && <p className="text-sm text-gray-400">{msg}</p>}
      <Button variant="outline" onClick={onClose}>Close</Button>
    </div>
  );
}