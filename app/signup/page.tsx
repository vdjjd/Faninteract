'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'master' | 'host'>('host');
  const [companyName, setCompanyName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [masterId, setMasterId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ✅ Step 1: Create Auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'http://localhost:3000/login',
        },
      });

      if (signUpError) throw signUpError;
      const userId = data.user?.id;
      if (!userId) throw new Error('No user ID returned from Supabase.');

      // ✅ Step 2: Insert depending on account type
      if (accountType === 'master') {
        const { error: insertError } = await supabase.from('master_accounts').insert([
          {
            id: userId,
            company_name: companyName,
            first_name: firstName,
            last_name: lastName,
            email,
          },
        ]);
        if (insertError) throw insertError;
      } else {
        const { error: insertError } = await supabase.from('hosts').insert([
          {
            id: userId,
            master_id: masterId || null,
            venue_name: venueName,
            first_name: firstName,
            last_name: lastName,
            username,
            email,
          },
        ]);
        if (insertError) throw insertError;
      }

      // ✅ Step 3: Success popup
      setShowPopup(true);
    } catch (err: any) {
      console.error('Signup error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <h1>Sign Up</h1>

      <form onSubmit={handleSignUp} style={formStyle}>
        {/* Account Type Selector */}
        <label style={labelStyle}>Account Type</label>
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as 'master' | 'host')}
          style={inputStyle}
        >
          <option value="host">Host Account</option>
          <option value="master">Master Account</option>
        </select>

        {accountType === 'master' ? (
          <>
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={inputStyle}
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
              style={inputStyle}
              required
            />
            <input
              type="text"
              placeholder="Master ID (optional for now)"
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
              style={inputStyle}
            />
          </>
        )}

        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />

        <button disabled={loading} style={buttonStyle}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>

        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>

      {showPopup && (
        <div style={overlayStyle}>
          <div style={popupStyle}>
            <h2>Verification Sent</h2>
            <p>
              A verification link has been sent to <strong>{email}</strong>.  
              Check your inbox to confirm your account.
            </p>
            <button
              style={buttonStyle}
              onClick={() => {
                setShowPopup(false);
                router.push('/login');
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
  color: 'white',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  width: '320px',
};

const inputStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #333',
  backgroundColor: '#1a1a1a',
  color: 'white',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#1e90ff',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  marginTop: '10px',
  textAlign: 'left',
  color: '#a0c4ff',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const popupStyle: React.CSSProperties = {
  backgroundColor: '#0d1625',
  border: '1px solid #1e90ff',
  borderRadius: '12px',
  padding: '30px',
  width: '90%',
  maxWidth: '400px',
  textAlign: 'center',
};
