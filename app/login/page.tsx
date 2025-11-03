'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false); // 👈 new

  const [accountType, setAccountType] = useState<'master' | 'host'>('host');
  const [companyName, setCompanyName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [masterId, setMasterId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  /* -------------------------------------------------------------------------- */
  /* 🧠 LOGIN HANDLER */
  /* -------------------------------------------------------------------------- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let emailToUse = identifier;

      if (!identifier.includes('@')) {
        const res = await fetch('/api/resolve-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Invalid username.');
        emailToUse = result.email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      if (signInError) throw signInError;

      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* 🧠 SIGNUP HANDLER (modal popup) */
  /* -------------------------------------------------------------------------- */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: { emailRedirectTo: 'http://localhost:3000/login' },
      });

      if (signUpError) throw signUpError;
      const userId = data.user?.id;
      if (!userId) throw new Error('No user ID returned from Supabase.');

      if (accountType === 'master') {
        const contact_name = `${firstName} ${lastName}`;
        const { error: insertError } = await supabase.from('master_accounts').insert([
          {
            id: userId,
            company_name: companyName,
            contact_name,
            contact_email: signupEmail,
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
            email: signupEmail,
          },
        ]);
        if (insertError) throw insertError;
      }

      setShowPopup(true);
    } catch (err: any) {
      console.error('Signup error:', err.message);
      setSignupError(err.message);
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Host Login</h1>

      <form onSubmit={handleLogin} style={formStyle}>
        <input
          type="text"
          placeholder="Username or Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Signing In...' : 'Login'}
        </button>

        {error && <p style={errorStyle}>{error}</p>}
      </form>

      <p style={signupTextStyle}>
        Don’t have an account?{' '}
        <span onClick={() => setShowSignup(true)} style={signupLinkStyle}>
          Sign up
        </span>
      </p>

      {/* ---------- SIGNUP MODAL POPUP ---------- */}
      {showSignup && (
        <div style={overlayStyle}>
          <div style={popupStyle}>
            <h2>Create Account</h2>

            <form onSubmit={handleSignUp} style={formStyle}>
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
                <input
                  type="text"
                  placeholder="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={inputStyle}
                  required
                />
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
                    placeholder="Master ID (optional)"
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
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                style={inputStyle}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                style={inputStyle}
                required
              />

              <button disabled={signupLoading} style={buttonStyle}>
                {signupLoading ? 'Creating Account...' : 'Sign Up'}
              </button>

              {signupError && <p style={{ color: 'red' }}>{signupError}</p>}
            </form>

            <button style={buttonStyle} onClick={() => setShowSignup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ✅ VERIFICATION POPUP */}
      {showPopup && (
        <div style={overlayStyle}>
          <div style={popupStyle}>
            <h2>Verification Sent</h2>
            <p>
              A verification link has been sent to <strong>{signupEmail}</strong>.
              Check your inbox to confirm your account.
            </p>
            <button
              style={buttonStyle}
              onClick={() => {
                setShowPopup(false);
                setShowSignup(false);
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
  width: '100%',
  background: 'linear-gradient(135deg,#0a2540,#1b2b44,#000000)',
  backgroundAttachment: 'fixed',
  backgroundSize: 'cover',
  backdropFilter: 'blur(10px)',
  color: 'white',
  padding: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: '20px',
  color: '#a0c4ff',
  textAlign: 'center',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '320px',
  backgroundColor: 'rgba(13,22,37,0.9)',
  padding: '30px',
  borderRadius: '12px',
  border: '1px solid #1e90ff',
  boxShadow: '0 0 20px rgba(30,144,255,0.3)',
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
  background: 'linear-gradient(to right, #1e90ff, #3a8dff)',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(30,144,255,0.3)',
  transition: 'all 0.2s ease-in-out',
};

const errorStyle: React.CSSProperties = {
  color: 'red',
  marginTop: '8px',
  fontSize: '0.9rem',
  textAlign: 'center',
};

const signupTextStyle: React.CSSProperties = {
  marginTop: '15px',
  color: '#ccc',
  textAlign: 'center',
  fontSize: '0.9rem',
};

const signupLinkStyle: React.CSSProperties = {
  color: '#1e90ff',
  textDecoration: 'underline',
  cursor: 'pointer',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
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

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  marginTop: '10px',
  textAlign: 'left',
  color: '#a0c4ff',
};
