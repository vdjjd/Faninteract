'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(error.message)
    router.push('/admin/dashboard')
  }

  return (
    <div style={pageStyle}>
      <h1>Host Login</h1>
      <form onSubmit={handleLogin} style={formStyle}>
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
        <button style={buttonStyle}>Log In</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
      <p>Don’t have an account? <a href="/signup">Sign up</a></p>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#0d0d0d',
  color: 'white',
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column' as const,
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
