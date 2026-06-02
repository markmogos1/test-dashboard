import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputStyle = {
  width: '100%',
  border: '2px solid #111',
  padding: '10px 12px',
  fontSize: '14px',
  background: 'var(--bg)',
  outline: 'none',
  boxSizing: 'border-box',
  borderRadius: 0,
  fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  color: 'var(--text-secondary)',
  marginBottom: '6px',
}

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error } = await (mode === 'signin' ? signIn(email, password) : signUp(email, password))

    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setMessage('Check your email to confirm your account, then sign in.')
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setMessage('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '2px solid #111',
        padding: '40px',
        width: '100%',
        maxWidth: '380px',
      }}>
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '22px', fontWeight: 500, marginBottom: '6px' }}>1%</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            momentum over perfection
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--trend-down)' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--trend-up)' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--accent)',
              border: '2px solid #111',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.65 : 1,
              borderRadius: 0,
              fontFamily: 'inherit',
            }}
          >
            {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', fontSize: '13px', color: '#111', padding: 0 }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => switchMode('signin')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', fontSize: '13px', color: '#111', padding: 0 }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
