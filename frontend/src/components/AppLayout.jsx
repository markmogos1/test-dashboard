import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from './TopBar'
import NavTabs from './NavTabs'

export function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color)
}

export default function AppLayout() {
  const { user } = useAuth()

  useEffect(() => {
    async function fetchAccent() {
      const { data } = await supabase
        .from('users_meta')
        .select('accent_color')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.accent_color) applyAccent(data.accent_color)
    }
    fetchAccent()
  }, [user.id])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar />
      <NavTabs />
      <main className="main-pad" style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 28px' }}>
        <Outlet />
      </main>
    </div>
  )
}
