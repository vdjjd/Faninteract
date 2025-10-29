'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // ✅ Step 1: Create Supabase Auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://www.faninteract.com/login', // ✅ live domain
        },
      })

      if (signUpError) throw signUpError
      const userId = data.user?.id
      if (!userId) throw new Error('No user ID returned from Supabase.')

      // ✅ Step 2: Insert into hosts table
      const { error: insertError } = await supabase.from('hosts').insert([
        {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          username,
          email,
        },
      ])

      if (insertError) throw insertError

      // ✅ Step 3: Show popup
      setShowPopup(true)
    } catch (err: any) {
      console.error('Signup error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <h1>Host Sign Up</h1>

      <form onSubmit={handleSignUp} style={formStyle}>
        {/* ✅ Corrected order */}
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
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

      <p>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#1e90ff' }}>
          Log in
        </a>
      </p>

      {/* 🔔 Popup for email verification */}
      {showPopup && (
        <div style={overlayStyle}>
          <div style={popupStyle}>
            <h2 style={{ color: '#5cc9ff', marginBottom: '10px' }}>
              Verification Sent
            </h2>
            <p style={{ lineHeight: 1.5 }}>
              A verification link has been sent to <strong>{email}</strong>.
              <br />
              Click the link in your email to verify your account, then log in
              with your username and password.
            </p>
            <button
              style={{
                ...buttonStyle,
                marginTop: '20px',
                backgroundColor: '#5cc9ff',
              }}
              onClick={() => {
                setShowPopup(false)
                router.push('/login')
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
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
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  width: '300px',
}

const inputStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #333',
  backgroundColor: '#1a1a1a',
  color: 'white',
}

const buttonStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#1e90ff',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const popupStyle: React.CSSProperties = {
  backgroundColor: '#0d1625',
  border: '1px solid #1e90ff',
  borderRadius: '12px',
  padding: '30px',
  width: '90%',
  maxWidth: '400px',
  textAlign: 'center',
  boxShadow: '0 0 25px rgba(56,189,248,0.3)',
}
