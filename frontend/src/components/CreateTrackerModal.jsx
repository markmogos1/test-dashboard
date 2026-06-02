import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TAG_COLORS = [
  '#c0392b', '#2980b9', '#8e44ad', '#e67e22', '#555555',
  '#2d7a2d', '#16a085', '#f39c12', '#1abc9c', '#d35400',
]

const TYPE_OPTIONS = [
  { value: 'binary', label: 'Binary', sub: 'One tap — done' },
  { value: 'tag', label: 'Tag-select', sub: 'Pick from your tags' },
  { value: 'scored', label: 'Scored', sub: 'Rate on a scale' },
]

const WEIGHT_OPTIONS = [
  { value: 1, label: 'Nice to have' },
  { value: 2, label: 'Important' },
  { value: 3, label: 'Very important' },
  { value: 4, label: 'Insanely important' },
]

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  zIndex: 100, padding: '40px 20px', overflowY: 'auto',
}

const inputStyle = {
  width: '100%', border: '2px solid #111', padding: '10px 12px',
  fontSize: '14px', background: 'var(--bg)', outline: 'none',
  boxSizing: 'border-box', borderRadius: 0, fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '.05em',
  color: 'var(--text-secondary)', marginBottom: '8px',
}

const sectionStyle = { marginBottom: '24px' }

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '40px', height: '22px', border: '2px solid #111', borderRadius: 0,
        background: checked ? 'var(--accent)' : 'var(--bg)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '2px',
      }}
    >
      <span style={{
        width: '14px', height: '14px', background: '#111',
        display: 'block', flexShrink: 0,
        transform: checked ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.15s',
      }} />
    </button>
  )
}

export default function CreateTrackerModal({ onClose, onCreated, tracker = null, onDeleted = null }) {
  const { user } = useAuth()
  const editMode = tracker !== null
  const [name, setName] = useState(tracker?.name ?? '')
  const [type, setType] = useState(tracker?.type ?? 'binary')
  const [frequencyDays, setFrequencyDays] = useState(tracker?.frequency_days ?? 1)
  const [weight, setWeight] = useState(tracker?.weight ?? 2)
  const [tags, setTags] = useState(tracker?.tags ?? [])
  const [newTagLabel, setNewTagLabel] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [flagRepeats, setFlagRepeats] = useState(tracker?.flag_repeats ?? false)
  const [flagRepeatTag, setFlagRepeatTag] = useState(tracker?.flag_repeat_tag ?? '')
  const [dueTomorrowNudge, setDueTomorrowNudge] = useState(tracker?.due_tomorrow_nudge ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function addTag() {
    const label = newTagLabel.trim()
    if (!label) return
    setTags(prev => [...prev, { label, color: newTagColor }])
    setNewTagLabel('')
    setNewTagColor(TAG_COLORS[(tags.length + 1) % TAG_COLORS.length])
  }

  function removeTag(i) {
    setTags(prev => {
      const next = prev.filter((_, idx) => idx !== i)
      if (flagRepeatTag === prev[i].label) setFlagRepeatTag('')
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (type === 'tag' && tags.length === 0) {
      setError('Add at least one tag before saving.')
      return
    }
    setError('')
    setLoading(true)

    const payload = {
      name: name.trim(),
      frequency_days: frequencyDays,
      weight,
      tags: type === 'tag' ? tags : [],
      flag_repeats: flagRepeats,
      flag_repeat_tag: flagRepeats && flagRepeatTag ? flagRepeatTag : null,
      due_tomorrow_nudge: dueTomorrowNudge,
    }

    if (editMode) {
      const { error: dbError } = await supabase.from('trackers').update(payload).eq('id', tracker.id)
      setLoading(false)
      if (dbError) { setError(dbError.message) }
      else { onCreated({ ...tracker, ...payload }) }
    } else {
      const { error: dbError } = await supabase.from('trackers').insert({ user_id: user.id, type, ...payload })
      setLoading(false)
      if (dbError) { setError(dbError.message) }
      else { onCreated() }
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    await supabase.from('logs').delete().eq('tracker_id', tracker.id)
    await supabase.from('trackers').delete().eq('id', tracker.id)
    setLoading(false)
    onDeleted(tracker.id)
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-scroll" style={{
        background: 'var(--surface)', border: '2px solid #111',
        width: '100%', maxWidth: '480px',
      }}>
        <div style={{
          borderBottom: '2px solid #111', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {editMode ? 'Edit tracker' : 'New tracker'}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '18px', lineHeight: 1, padding: '2px 6px', color: '#111',
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 20px' }}>

          {/* Name */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning vitamins"
              required
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Type — locked in edit mode */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !editMode && setType(opt.value)}
                  style={{
                    border: '2px solid #111', padding: '10px 8px',
                    background: type === opt.value ? 'var(--accent)' : 'var(--bg)',
                    cursor: editMode ? 'default' : 'pointer', textAlign: 'left', borderRadius: 0,
                    opacity: editMode && type !== opt.value ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 500 }}>{opt.label}</div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
            {editMode && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Type cannot be changed after creation.
              </div>
            )}
          </div>

          {/* Tags (only for tag-select type) */}
          {type === 'tag' && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Tags</label>

              {/* Existing tags */}
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {tags.map((tag, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      border: '2px solid #111', padding: '4px 8px',
                      fontSize: '12px', fontWeight: 500, background: 'var(--surface)',
                    }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                      {tag.label}
                      <button type="button" onClick={() => removeTag(i)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '14px', lineHeight: 1, padding: 0, color: '#999',
                      }}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add new tag row */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={newTagLabel}
                    onChange={e => setNewTagLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Tag name"
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '140px' }}>
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      style={{
                        width: '20px', height: '20px', background: color, borderRadius: '50%',
                        border: newTagColor === color ? '2px solid #111' : '2px solid transparent',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTag}
                  style={{
                    border: '2px solid #111', background: 'var(--bg)',
                    padding: '10px 14px', fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', borderRadius: 0, whiteSpace: 'nowrap',
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* Frequency */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Frequency</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setFrequencyDays(d => Math.max(1, d - 1))}
                style={{
                  border: '2px solid #111', background: 'var(--bg)',
                  width: '36px', height: '36px', fontSize: '18px',
                  cursor: 'pointer', borderRadius: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{ fontSize: '14px', fontWeight: 500, minWidth: '100px', textAlign: 'center' }}>
                {frequencyDays === 1 ? 'Every day' : `Every ${frequencyDays} days`}
              </span>
              <button
                type="button"
                onClick={() => setFrequencyDays(d => Math.min(14, d + 1))}
                style={{
                  border: '2px solid #111', background: 'var(--bg)',
                  width: '36px', height: '36px', fontSize: '18px',
                  cursor: 'pointer', borderRadius: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>

          {/* Weight */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {WEIGHT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWeight(opt.value)}
                  style={{
                    border: '2px solid #111', padding: '10px 14px',
                    background: weight === opt.value ? 'var(--accent)' : 'var(--bg)',
                    cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                    fontWeight: weight === opt.value ? 500 : 400, borderRadius: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  {opt.label}
                  <span style={{ fontSize: '11px', color: weight === opt.value ? '#111' : 'var(--text-secondary)' }}>
                    {'●'.repeat(opt.value)}{'○'.repeat(4 - opt.value)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Flag repeats */}
          {type === 'tag' && (
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Flag consecutive repeats</label>
                <Toggle checked={flagRepeats} onChange={setFlagRepeats} />
              </div>
              {flagRepeats && tags.length > 0 && (
                <div>
                  <label style={{ ...labelStyle, marginBottom: '6px' }}>Which tag to flag</label>
                  <select
                    value={flagRepeatTag}
                    onChange={e => setFlagRepeatTag(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' }}
                  >
                    <option value="">Any repeat</option>
                    {tags.map((tag, i) => (
                      <option key={i} value={tag.label}>{tag.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Due tomorrow nudge */}
          <div style={{ ...sectionStyle, marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>"Due tomorrow" nudge</label>
              <Toggle checked={dueTomorrowNudge} onChange={setDueTomorrowNudge} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Shows a soft heads-up the day before a window expires.
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--trend-down)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, border: '2px solid #111', background: 'var(--bg)',
                padding: '12px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', borderRadius: 0,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, border: '2px solid #111', background: 'var(--accent)',
                padding: '12px', fontSize: '13px', fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.65 : 1, borderRadius: 0,
              }}
            >
              {loading ? '...' : editMode ? 'Save changes' : 'Save tracker'}
            </button>
          </div>

          {editMode && onDeleted && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={{
                width: '100%', marginTop: '10px',
                border: `2px solid ${confirmDelete ? 'var(--trend-down)' : '#ccc'}`,
                background: confirmDelete ? 'var(--trend-down)' : 'transparent',
                color: confirmDelete ? '#fff' : 'var(--text-secondary)',
                padding: '10px', fontSize: '13px', fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 0,
              }}
            >
              {confirmDelete ? 'Confirm — delete tracker + all logs' : 'Delete tracker'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
