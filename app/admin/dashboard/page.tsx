'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) router.push('/login')
      else setUser(data.user)
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={pageStyle}>
      <h1>Welcome, {user?.email}</h1>
      <p>This is your Host Dashboard. Your Game Day Experiences will appear here.</p>
      <button style={buttonStyle} onClick={handleLogout}>Log Out</button>
    </div>
  )
}

const pageStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#0d0d0d',
  color: 'white',
}

const buttonStyle = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#ff4d4d',
  color: 'white',
  cursor: 'pointer',
}
