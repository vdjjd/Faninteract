'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSubmit() {
    if (password.length < 8) {
      setMsg('❌ Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMsg('❌ Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) setMsg(`❌ ${error.message}`);
    else setMsg('✅ Password updated successfully.');
  }

  return (
    <div className="p-4 space-y-4 text-white bg-black/80 rounded-lg border border-gray-700 shadow-lg">
      <h2 className="text-lg font-semibold">Change Password</h2>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
        placeholder="New password"
      />

      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
        placeholder="Confirm new password"
      />

      <div className="flex flex-col gap-2">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Updating…' : 'Update Password'}
        </Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {msg && <p className="text-sm text-gray-400">{msg}</p>}
    </div>
  );
}