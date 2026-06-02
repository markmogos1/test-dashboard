import { getWindowState } from '../lib/windows'
import TrendLine from './TrendLine'

const TYPE_LABELS = { binary: 'Binary', tag: 'Tag-select', scored: 'Scored' }
const WEIGHT_LABELS = { 1: 'Nice to have', 2: 'Important', 3: 'Very important', 4: 'Insanely important' }

const STATE_LABELS = {
  done: 'Done',
  ahead: 'Ahead +',
  available: 'On track',
  due_tomorrow: 'Due tomorrow',
  pending: 'Pending',
}

function StatePill({ state }) {
  const isOutline = state === 'pending' || state === 'due_tomorrow'
  return (
    <span style={{
      fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em',
      padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0,
      border: '2px solid #111',
      background: isOutline ? 'transparent' : 'var(--accent)',
      color: '#111',
    }}>
      {STATE_LABELS[state]}
    </span>
  )
}

const btnBase = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '2px 5px', fontSize: '12px', color: 'var(--text-secondary)',
  lineHeight: 1, borderRadius: 0,
}

export default function TrackerCard({ tracker, logs = [], today, onClick, onEdit, onMoveUp, onMoveDown }) {
  const { name, type, frequency_days, weight } = tracker
  const state = getWindowState(tracker, logs, today)
  const freqLabel = frequency_days === 1 ? 'Every day' : `Every ${frequency_days} days`

  return (
    <div
      onClick={onClick}
      style={{
        border: '2px solid #111',
        background: 'var(--surface)',
        padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        cursor: 'pointer',
      }}
    >
      {/* Name + state pill */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.3 }}>{name}</span>
        <StatePill state={state} />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {freqLabel}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {TYPE_LABELS[type]}
        </span>
      </div>

      {/* Trend graph */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
        <TrendLine tracker={tracker} logs={logs} today={today} />
      </div>

      {/* Weight + actions */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {WEIGHT_LABELS[weight]}
        </span>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {onMoveUp && (
            <button onClick={e => { e.stopPropagation(); onMoveUp() }} style={btnBase} title="Move up">↑</button>
          )}
          {onMoveDown && (
            <button onClick={e => { e.stopPropagation(); onMoveDown() }} style={btnBase} title="Move down">↓</button>
          )}
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit() }}
              style={{ ...btnBase, marginLeft: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em' }}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
