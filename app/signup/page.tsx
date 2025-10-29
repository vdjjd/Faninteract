'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from "../../lib/utils";

export default function SignUpPage() {
  const [accountType, setAccountType] = useState<'master' | 'host'>('host');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // ✅ Create user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      const userId = data.user?.id;
      if (!userId) throw new Error('No user ID returned from Supabase.');

      if (accountType === 'master') {
        // ✅ Insert into master_accounts
        const { error } = await supabase.from('master_accounts').insert([
          {
            id: userId,
            auth_id: userId, // 👈 NEW
            company_name: companyName,
            contact_name: contactName,
            contact_email: email,
            role: 'master',
          },
        ]);
        if (error) throw error;
        setMessage('✅ Master account created! Please verify your email.');
      } else {
        // ✅ Insert into hosts
        const { error } = await supabase.from('hosts').insert([
          {
            id: userId,
            auth_id: userId, // 👈 NEW — required for dashboard linkage
            username,
            venue_name: venueName,
            email,
            role: 'host',
          },
        ]);
        if (error) throw error;
        setMessage('✅ Host account created! Please verify your email.');
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'min-h-screen',
        'flex flex-col items-center justify-center',
        'bg-[linear-gradient(135deg,#0a2540,#1b2b44,#000000)]',
        'text-white',
        'p-6'
      )}
    >
      <h1 className={cn('text-4xl font-bold mb-6')}>Create Your Account</h1>

      <form
        onSubmit={handleSignUp}
        className={cn(
          'w-full max-w-md',
          'bg-[#0b111d] p-8 rounded-2xl',
          'border border-blue-900/40 shadow-lg',
          'space-y-4'
        )}
      >
        {/* Account Type Selection */}
        <div className={cn('flex', 'justify-center', 'gap-4', 'mb-4')}>
          <label className={cn('flex', 'items-center', 'gap-2', 'cursor-pointer')}>
            <input
              type="radio"
              name="accountType"
              value="host"
              checked={accountType === 'host'}
              onChange={() => setAccountType('host')}
              className="accent-sky-500"
            />
            Host Account
          </label>
          <label className={cn('flex', 'items-center', 'gap-2', 'cursor-pointer')}>
            <input
              type="radio"
              name="accountType"
              value="master"
              checked={accountType === 'master'}
              onChange={() => setAccountType('master')}
              className="accent-sky-500"
            />
            Master Account
          </label>
        </div>

        {accountType === 'master' ? (
          <>
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={cn('w-full', 'p-3', 'rounded-md', 'bg-[#1b2b44]', 'border', 'border-blue-900/40')}
              required
            />
            <input
              type="text"
              placeholder="Contact Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={cn('w-full', 'p-3', 'rounded-md', 'bg-[#1b2b44]', 'border', 'border-blue-900/40')}
              required
            />
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Venue Name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              className={cn('w-full', 'p-3', 'rounded-md', 'bg-[#1b2b44]', 'border', 'border-blue-900/40')}
              required
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn('w-full', 'p-3', 'rounded-md', 'bg-[#1b2b44]', 'border', 'border-blue-900/40')}
              required
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn('w-full', 'p-3', 'rounded-md', 'bg-[#1b2b44]', 'border', 'border-blue-900/40')}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn('w-full', 'p-3', 'rounded-md', 'bg-[#1b2b44]', 'border', 'border-blue-900/40')}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full',
            'bg-gradient-to-r from-sky-500 to-blue-600',
            'py-3 rounded-lg font-semibold shadow-md',
            'hover:scale-105 transition-transform'
          )}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>

        {message && (
          <p className={cn('text-center', 'mt-4', 'text-sm', 'text-gray-300')}>{message}</p>
        )}
      </form>

      <p className={cn('mt-6', 'text-gray-400')}>
        Already have an account?{' '}
        <a href="/login" className={cn('text-sky-400', 'hover:underline')}>
          Log in
        </a>
      </p>
    </div>
  );
}
