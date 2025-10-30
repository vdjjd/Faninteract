'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChangeEmailModalProps {
  onClose: () => void;
}

export default function ChangeEmailModal({ onClose }: ChangeEmailModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChangeEmail = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: user, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error(error?.message || 'User not found');

      const { error: updateError } = await supabase
        .from('hosts')
        .update({ email })
        .eq('auth_id', user.user?.id);

      if (updateError) throw updateError;

      setMessage('✅ Email updated successfully!');
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setMessage(`❌ Failed to update email: ${err.message || err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('flex', 'flex-col', 'gap-4', 'p-4')}>
      <h2 className={cn('text-lg', 'font-semibold')}>Change Email</h2>
      <input
        type="email"
        placeholder="Enter new email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={cn('w-full', 'p-2', 'rounded-md', 'text-black')}
      />
      <div className={cn('flex', 'justify-end', 'gap-2')}>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleChangeEmail} disabled={loading || !email}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
      {message && <p className={cn('text-sm', 'mt-2')}>{message}</p>}
    </div>
  );
}
