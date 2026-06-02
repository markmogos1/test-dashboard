import { getWindowState } from '../lib/windows'

const PILL_STYLE_BASE = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 10px', fontSize: '12px', fontWeight: 500,
  cursor: 'pointer', whiteSpace: 'nowrap', border: '2px solid #111',
  userSelect: 'none',
}

function pillStyle(state) {
  const yellow = { background: 'var(--accent)', color: '#111' }
  const outline = { background: 'transparent', color: '#111' }
  return state === 'pending' ? outline : yellow
}

function pillLabel(state, name) {
  if (state === 'due_tomorrow') return `${name} · due tomorrow`
  if (state === 'ahead') return `${name} +`
  return name
}

export default function TodayBar({ trackers, logsByTracker, today, onPillClick }) {
  if (!trackers.length) return null

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        fontSize: '11px', color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px',
      }}>
        Today
      </div>
      <div style={{
        border: '2px solid #111', padding: '14px 18px',
        overflowX: 'auto',
        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        minHeight: '52px',
      }}>
        {trackers.map(tracker => {
          const logs = logsByTracker[tracker.id] ?? []
          const state = getWindowState(tracker, logs, today)
          return (
            <button
              key={tracker.id}
              onClick={() => onPillClick(tracker)}
              style={{ ...PILL_STYLE_BASE, ...pillStyle(state) }}
            >
              {pillLabel(state, tracker.name)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
