import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isBonus, shouldNudge } from '../lib/windows'
import { format } from 'date-fns'

const TAG_COLORS = [
  '#c0392b', '#2980b9', '#8e44ad', '#e67e22', '#555555',
  '#2d7a2d', '#16a085', '#f39c12', '#1abc9c', '#d35400',
]

// 0–100 input maps to tiers. 90+ = upward trend. 95+ = Amazing (unambiguous top).
const SCORE_RANGES = [
  { max: 49,  label: 'Poor',    hint: '0–49',   score: 40 },
  { max: 69,  label: 'Okay',    hint: '50–69',  score: 60 },
  { max: 89,  label: 'Good',    hint: '70–89',  score: 75 },
  { max: 94,  label: 'Great',   hint: '90–94',  score: 88 },
  { max: 100, label: 'Amazing', hint: '95–100', score: 97 },
]

function scoreInfo(n) {
  const num = parseInt(n, 10)
  if (isNaN(num) || num < 0 || num > 100) return null
  return SCORE_RANGES.find(r => num <= r.max) ?? SCORE_RANGES[SCORE_RANGES.length - 1]
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 200, padding: '20px',
}

// ── Binary modal ──────────────────────────────────────────────────────────────
function BinaryContent({ onLog, loading }) {
  return (
    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
      <button
        onClick={onLog}
        disabled={loading}
        style={{
          width: '88px', height: '88px',
          background: 'var(--accent)', border: '2px solid #111',
          fontSize: '36px', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.65 : 1, borderRadius: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✓
      </button>
      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        Tap to log
      </div>
    </div>
  )
}

// ── Scored modal ──────────────────────────────────────────────────────────────
function ScoredContent({ onLog, loading }) {
  const [raw, setRaw] = useState('')
  const info = scoreInfo(raw)

  function handleKey(e) {
    if (e.key === 'Enter' && info) onLog({ value: info.score })
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Number input row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onKeyDown={handleKey}
          placeholder="—"
          autoFocus
          style={{
            width: '80px', border: '2px solid #111', padding: '10px 12px',
            fontSize: '28px', fontWeight: 500, textAlign: 'center',
            background: 'var(--bg)', outline: 'none', borderRadius: 0,
            fontFamily: 'inherit', MozAppearance: 'textfield',
          }}
        />
        {info ? (
          <span style={{ fontSize: '20px', fontWeight: 500 }}>{info.label}</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {SCORE_RANGES.map(r => (
              <span key={r.label} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {r.hint} — {r.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => info && onLog({ value: info.score })}
        disabled={!info || loading}
        style={{
          width: '100%', border: '2px solid #111',
          background: !info ? 'var(--bg)' : 'var(--accent)',
          padding: '13px', fontSize: '13px', fontWeight: 500,
          cursor: !info || loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.65 : 1, borderRadius: 0, fontFamily: 'inherit',
          color: !info ? 'var(--text-secondary)' : '#111',
        }}
      >
        {loading ? '...' : !info ? 'Enter 0–100' : `Log ${raw} — ${info.label}`}
      </button>
    </div>
  )
}

// ── Tag-select modal ──────────────────────────────────────────────────────────
function TagContent({ tracker, logs, today, onLog, onTrackerUpdated, loading }) {
  const [selected, setSelected] = useState([])
  const [addingTag, setAddingTag] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const [saving, setSaving] = useState(false)

  const nudge = shouldNudge(tracker, logs, today, selected)

  function toggleTag(label) {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  async function addTag() {
    const label = newLabel.trim()
    if (!label) return
    setSaving(true)
    const newTag = { label, color: newColor }
    const updatedTags = [...(tracker.tags ?? []), newTag]
    const { error } = await supabase
      .from('trackers')
      .update({ tags: updatedTags })
      .eq('id', tracker.id)
    setSaving(false)
    if (!error) {
      onTrackerUpdated({ ...tracker, tags: updatedTags })
      setSelected(prev => [...prev, label])
      setNewLabel('')
      setAddingTag(false)
    }
  }

  const allTags = tracker.tags ?? []

  return (
    <div style={{ padding: '20px 24px 24px' }}>
      {/* Nudge */}
      {nudge && (
        <div style={{
          marginBottom: '14px', fontSize: '13px',
          color: 'var(--nudge)', fontWeight: 500,
        }}>
          {tracker.flag_repeat_tag
            ? `you logged "${tracker.flag_repeat_tag}" last time too — still?`
            : 'you logged the same tag recently — still?'}
        </div>
      )}

      {/* Tag bubbles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {allTags.map(tag => {
          const isSelected = selected.includes(tag.label)
          return (
            <button
              key={tag.label}
              onClick={() => toggleTag(tag.label)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', border: '2px solid #111',
                background: isSelected ? 'var(--accent)' : 'var(--bg)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: tag.color, flexShrink: 0,
              }} />
              {tag.label}
            </button>
          )
        })}

        {/* Add tag inline */}
        {!addingTag && (
          <button
            onClick={() => setAddingTag(true)}
            style={{
              padding: '8px 14px', border: '2px solid #111',
              background: 'var(--bg)', fontSize: '13px', cursor: 'pointer',
              borderRadius: 0, color: 'var(--text-secondary)',
            }}
          >
            + add tag
          </button>
        )}
      </div>

      {/* Inline add-tag form */}
      {addingTag && (
        <div style={{
          border: '2px solid #111', padding: '12px', marginBottom: '16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Tag name"
            autoFocus
            style={{
              border: '2px solid #111', padding: '8px 10px', fontSize: '13px',
              background: 'var(--bg)', outline: 'none', borderRadius: 0,
              fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {TAG_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: color,
                  border: newColor === color ? '2px solid #111' : '2px solid transparent',
                  cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setAddingTag(false)} style={{
              flex: 1, border: '2px solid #111', background: 'var(--bg)',
              padding: '8px', fontSize: '13px', cursor: 'pointer', borderRadius: 0,
            }}>
              Cancel
            </button>
            <button onClick={addTag} disabled={saving} style={{
              flex: 2, border: '2px solid #111', background: 'var(--accent)',
              padding: '8px', fontSize: '13px', fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer', borderRadius: 0,
            }}>
              {saving ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => onLog({ tags: selected })}
        disabled={loading || selected.length === 0}
        style={{
          width: '100%', border: '2px solid #111',
          background: selected.length === 0 ? 'var(--bg)' : 'var(--accent)',
          padding: '13px', fontSize: '13px', fontWeight: 500,
          cursor: loading || selected.length === 0 ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.65 : 1, borderRadius: 0,
          color: selected.length === 0 ? 'var(--text-secondary)' : '#111',
        }}
      >
        {loading ? '...' : selected.length === 0 ? 'Select at least one tag' : `Log ${selected.join(', ')}`}
      </button>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function LogModal({ tracker, logs, today, onClose, onLogged, onTrackerUpdated }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bonus = isBonus(tracker, logs, today)

  async function handleLog(extra = {}) {
    setLoading(true)
    setError('')

    const logData = {
      tracker_id: tracker.id,
      user_id: user.id,
      date: today,
      value: extra.value ?? null,
      tags: extra.tags ?? null,
      is_bonus: bonus,
    }

    const { data, error: dbErr } = await supabase
      .from('logs')
      .insert(logData)
      .select()
      .single()

    setLoading(false)
    if (dbErr) {
      setError(dbErr.message)
    } else {
      onLogged(data)
    }
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-scroll" style={{
        background: 'var(--surface)', border: '2px solid #111',
        width: '100%', maxWidth: '420px',
      }}>
        {/* Header */}
        <div style={{
          borderBottom: '2px solid #111', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>{tracker.name}</div>
            {bonus && (
              <div style={{ fontSize: '11px', color: 'var(--nudge)', marginTop: '2px' }}>
                Already logged this window — this counts as a bonus session
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '18px', lineHeight: 1, padding: '2px 6px', color: '#111',
          }}>×</button>
        </div>

        {/* Content by type */}
        {tracker.type === 'binary' && (
          <BinaryContent onLog={() => handleLog()} loading={loading} />
        )}
        {tracker.type === 'scored' && (
          <ScoredContent onLog={handleLog} loading={loading} />
        )}
        {tracker.type === 'tag' && (
          <TagContent
            tracker={tracker}
            logs={logs}
            today={today}
            onLog={handleLog}
            onTrackerUpdated={onTrackerUpdated}
            loading={loading}
          />
        )}

        {error && (
          <div style={{ padding: '0 24px 16px', fontSize: '13px', color: 'var(--trend-down)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
