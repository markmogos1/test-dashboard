import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const ALLOWED = (import.meta.env.VITE_ALLOWED_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

function isAllowed(email) {
  if (ALLOWED.length === 0) return true
  return ALLOWED.includes(email.toLowerCase())
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      if (u && !isAllowed(u.email)) {
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(u)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (u && !isAllowed(u.email)) {
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(u)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    if (!isAllowed(email)) {
      return { error: { message: 'This email is not authorised to access this app.' } }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password) {
    if (!isAllowed(email)) {
      return { error: { message: 'This email is not authorised to access this app.' } }
    }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
