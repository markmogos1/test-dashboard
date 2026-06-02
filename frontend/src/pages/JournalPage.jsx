import { useEffect, useState } from 'react'
import { format, parse, addDays, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const today = format(new Date(), 'yyyy-MM-dd')

const REF = new Date()
function pd(s) { return parse(s, 'yyyy-MM-dd', REF) }

const QUESTIONS = [
  { key: 'q1', text: 'What went well today?' },
  { key: 'q2', text: "What's on your mind?" },
  { key: 'q3', text: 'One thing for tomorrow?' },
]

function activityLabel(log) {
  const t = log.trackers
  if (!t) return ''
  if (t.type === 'binary') return '✓'
  if (t.type === 'tag') return (log.tags ?? []).join(', ')
  if (t.type === 'scored') {
    const v = log.value
    if (v >= 97) return `${v} · Amazing`
    if (v >= 88) return `${v} · Great`
    if (v >= 75) return `${v} · Good`
    if (v >= 60) return `${v} · Okay`
    return `${v} · Poor`
  }
  return ''
}

export default function JournalPage() {
  const { user } = useAuth()
  const [viewDate, setViewDate] = useState(today)
  const [answers, setAnswers] = useState({})
  const [savedAnswers, setSavedAnswers] = useState({})
  const [dailyLogs, setDailyLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved'

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: entry }, { data: logs }] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', viewDate)
          .maybeSingle(),
        supabase
          .from('logs')
          .select('*, trackers(id, name, type, tags)')
          .eq('user_id', user.id)
          .eq('date', viewDate),
      ])
      const a = entry?.answers ?? {}
      setAnswers(a)
      setSavedAnswers(a)
      setDailyLogs(logs ?? [])
      setLoading(false)
    }
    load()
  }, [viewDate])

  async function save(nextAnswers) {
    setSaveStatus('saving')
    await supabase.from('journal_entries').upsert(
      { user_id: user.id, date: viewDate, answers: nextAnswers },
      { onConflict: 'user_id,date' },
    )
    setSavedAnswers(nextAnswers)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  function handleChange(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function handleBlur(key) {
    // Only save if the value actually changed
    if (answers[key] !== savedAnswers[key]) {
      save({ ...answers })
    }
  }

  const isToday = viewDate === today
  const canGoForward = viewDate < today
  const dateLabel = isToday ? 'Today' : format(pd(viewDate), 'MMMM d, yyyy')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => setViewDate(format(subDays(pd(viewDate), 1), 'yyyy-MM-dd'))}
          style={{
            border: '2px solid #111', background: 'var(--surface)',
            padding: '6px 16px', fontSize: '16px', fontWeight: 500,
            cursor: 'pointer', borderRadius: 0, lineHeight: 1,
          }}
        >
          ←
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 500 }}>{dateLabel}</div>
          {isToday && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '2px' }}>
              {format(new Date(), 'MMMM d, yyyy')}
            </div>
          )}
        </div>

        <button
          onClick={() => setViewDate(format(addDays(pd(viewDate), 1), 'yyyy-MM-dd'))}
          disabled={!canGoForward}
          style={{
            border: '2px solid #111',
            background: canGoForward ? 'var(--surface)' : 'transparent',
            padding: '6px 16px', fontSize: '16px', fontWeight: 500,
            cursor: canGoForward ? 'pointer' : 'default', borderRadius: 0,
            color: canGoForward ? '#111' : '#ccc', lineHeight: 1,
          }}
        >
          →
        </button>
      </div>

      {/* Questions */}
      <div style={{ border: '2px solid #111', background: 'var(--surface)', padding: '24px 24px 20px' }}>
        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {QUESTIONS.map(q => (
              <div key={q.key}>
                <div style={{
                  fontSize: '11px', color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px',
                }}>
                  {q.text}
                </div>
                <textarea
                  value={answers[q.key] ?? ''}
                  onChange={e => handleChange(q.key, e.target.value)}
                  onBlur={() => handleBlur(q.key)}
                  rows={3}
                  placeholder="—"
                  style={{
                    width: '100%', border: '2px solid #111', borderRadius: 0,
                    padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit',
                    resize: 'vertical', background: '#fafafa', outline: 'none',
                    boxSizing: 'border-box', color: '#111',
                  }}
                />
              </div>
            ))}

            {/* Save status */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '16px' }}>
              {saveStatus === 'saving' && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Saving…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span style={{ fontSize: '11px', color: 'var(--trend-up)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Saved ✓
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* That day's tracker activity */}
      {!loading && dailyLogs.length > 0 && (
        <div style={{ border: '2px solid #111', background: 'var(--surface)', padding: '20px' }}>
          <div style={{
            fontSize: '11px', color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '14px',
          }}>
            Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dailyLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>
                  {log.trackers?.name ?? '—'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {activityLabel(log)}
                </span>
                {log.is_bonus && (
                  <span style={{
                    fontSize: '10px', color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '.05em',
                    border: '1px solid #ccc', padding: '1px 5px',
                  }}>
                    bonus
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for past dates with no activity or entry */}
      {!loading && dailyLogs.length === 0 && !isToday && Object.keys(answers).length === 0 && (
        <div style={{
          border: '2px solid #eee', padding: '24px',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            No activity on this day
          </span>
        </div>
      )}

    </div>
  )
}
