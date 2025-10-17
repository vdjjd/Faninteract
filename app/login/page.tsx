'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { BRAND_LOGO, BRAND_NAME } from '@/lib/constants'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // ✅ Step 1: Look up the email from the hosts table using the username
      const { data: host, error: lookupError } = await supabase
        .from('hosts')
        .select('email')
        .eq('username', username)
        .single()

      if (lookupError || !host) {
        throw new Error('Invalid username. Please check and try again.')
      }

      // ✅ Step 2: Sign in using the retrieved email and entered password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: host.email,
        password,
      })

      if (signInError) throw signInError

      // ✅ Step 3: Redirect to the Host Dashboard
      router.push('/admin/dashboard')
    } catch (err: any) {
      console.error('Login error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <img
        src={BRAND_LOGO}
        alt={`${BRAND_NAME} logo`}
        style={{ width: 160, marginBottom: 20 }}
      />
      <h1 style={{ marginBottom: 10 }}>{BRAND_NAME} Host Login</h1>

      <form onSubmit={handleLogin} style={formStyle}>
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
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Signing In...' : 'Login'}
        </button>
        {error && (
          <p style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>
            {error}
          </p>
        )}
      </form>

      <p style={{ marginTop: 15 }}>
        Don’t have an account?{' '}
        <a href="/signup" style={{ color: '#1e90ff' }}>
          Sign up
        </a>
      </p>
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
  background: 'linear-gradient(180deg, #0d0d0d, #1a1a1a)',
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  width: '300px',
}

const inputStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: 6,
  border: '1px solid #333',
  background: '#111',
  color: '#fff',
}

const buttonStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: 6,
  border: 'none',
  background: '#1e90ff',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
}
