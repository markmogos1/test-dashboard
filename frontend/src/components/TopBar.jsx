import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { applyAccent } from './AppLayout'

const ACCENT_SWATCHES = [
  '#f0c800', '#ff6b6b', '#4ecdc4', '#45b7d1',
  '#a29bfe', '#fd79a8', '#00b894', '#e17055',
]

function SettingsModal({ onClose }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  async function handleAccentChange(color) {
    applyAccent(color)
    setSaving(true)
    await supabase.from('users_meta').upsert(
      { id: user.id, accent_color: color },
      { onConflict: 'id' },
    )
    setSaving(false)
  }

  const current = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim()

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: '20px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--surface)', border: '2px solid #111',
        width: '100%', maxWidth: '320px',
      }}>
        <div style={{
          borderBottom: '2px solid #111', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Settings
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 6px', color: '#111' }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '12px' }}>
            Accent color {saving && '· Saving…'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ACCENT_SWATCHES.map(color => (
              <button
                key={color}
                onClick={() => handleAccentChange(color)}
                style={{
                  width: '32px', height: '32px', background: color,
                  border: current === color ? '3px solid #111' : '2px solid #ccc',
                  cursor: 'pointer', borderRadius: 0, padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TopBar() {
  const { user, signOut } = useAuth()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <header style={{ borderBottom: '2px solid #111', background: 'var(--bg)' }}>
        <div style={{
          maxWidth: '960px', margin: '0 auto', padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '54px',
        }}>
          <span style={{ fontSize: '22px', fontWeight: 500 }}>1%</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="topbar-email" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {user?.email}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'none', border: '2px solid #111',
                padding: '4px 10px', fontSize: '16px', lineHeight: 1,
                cursor: 'pointer', borderRadius: 0,
              }}
              title="Settings"
            >
              ⚙
            </button>
            <button
              onClick={signOut}
              style={{
                background: 'none', border: '2px solid #111',
                padding: '4px 14px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', borderRadius: 0,
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
