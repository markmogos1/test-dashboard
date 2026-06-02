import { NavLink } from 'react-router-dom'

const TABS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Overall', path: '/overall' },
  { label: 'Journal', path: '/journal' },
]

export default function NavTabs() {
  return (
    <nav style={{
      borderBottom: '2px solid #111',
      background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        gap: '0',
      }}>
        {TABS.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: '#111',
              borderBottom: isActive ? '2px solid #111' : '2px solid transparent',
              marginBottom: '-2px',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
