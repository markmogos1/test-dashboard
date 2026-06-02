import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { parse, differenceInCalendarDays } from 'date-fns'
import {
  LineChart, Line, ResponsiveContainer, Tooltip, YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { buildOverallData, getOverallLabel } from '../lib/scoring'

const today = format(new Date(), 'yyyy-MM-dd')

const REF = new Date()
function pd(s) { return parse(s, 'yyyy-MM-dd', REF) }

function fmtDate(dateStr) {
  if (dateStr === today) return 'Today'
  const daysAgo = differenceInCalendarDays(pd(today), pd(dateStr))
  if (daysAgo === 1) return 'Yesterday'
  return `${daysAgo} days ago`
}

function OverallDot(props) {
  const { cx, cy, payload } = props
  if (!cx || !cy || !payload) return null
  if (payload.date === today) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="var(--accent)" className="today-ring" />
        <circle cx={cx} cy={cy} r={6} fill="var(--accent)" stroke="#111" strokeWidth={2} className="today-dot" />
      </g>
    )
  }
  return null
}

function OverallTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{
      background: '#fff', border: '2px solid #111',
      padding: '5px 10px', fontSize: '12px', fontWeight: 500,
      pointerEvents: 'none',
    }}>
      {fmtDate(d.date)} · {d.score}
    </div>
  )
}

const LABEL_COLOR = {
  'trending up': 'var(--trend-up)',
  'holding steady': 'var(--text-secondary)',
  'needs attention': 'var(--trend-down)',
}

export default function Overall() {
  const { user } = useAuth()
  const [trackers, setTrackers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: tData }, { data: lData }] = await Promise.all([
        supabase.from('trackers').select('*').eq('user_id', user.id),
        supabase.from('logs').select('*').eq('user_id', user.id),
      ])
      setTrackers(tData ?? [])
      setLogs(lData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const logsByTracker = useMemo(() => {
    const map = {}
    logs.forEach(l => {
      if (!map[l.tracker_id]) map[l.tracker_id] = []
      map[l.tracker_id].push(l)
    })
    return map
  }, [logs])

  const data = useMemo(
    () => buildOverallData(trackers, logsByTracker, today),
    [trackers, logsByTracker],
  )

  const currentScore = data.length > 0 ? data[data.length - 1].score : null
  const label = getOverallLabel(data)

  if (loading) {
    return (
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '24px 0' }}>
        Loading...
      </div>
    )
  }

  if (trackers.length === 0) {
    return (
      <div style={{ border: '2px solid #111', padding: '60px 24px', textAlign: 'center', background: 'var(--surface)' }}>
        <div style={{ fontSize: '36px', fontWeight: 500, marginBottom: '10px' }}>—</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Add trackers to see your score
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Score card */}
      <div style={{
        border: '2px solid #111', background: 'var(--surface)',
        padding: '36px 28px 28px',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '10px' }}>
          1% score
        </div>
        <div style={{ fontSize: '72px', fontWeight: 500, lineHeight: 1, marginBottom: '10px' }}>
          {currentScore ?? '—'}
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em',
          color: LABEL_COLOR[label],
        }}>
          {label}
        </div>
      </div>

      {/* Trend chart card */}
      <div style={{ border: '2px solid #111', background: 'var(--surface)', padding: '20px 20px 16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '12px' }}>
          Momentum over time
        </div>

        {data.length < 2 ? (
          <svg width="100%" height={140} style={{ display: 'block' }}>
            <line
              x1="6" y1={140 * 0.62} x2="97%" y2={140 * 0.62}
              stroke="#ddd" strokeWidth={1.5} strokeDasharray="4 6"
            />
          </svg>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
              <YAxis domain={[0, 100]} hide />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#111"
                strokeWidth={2}
                dot={<OverallDot />}
                activeDot={false}
                isAnimationActive={false}
              />
              <Tooltip content={<OverallTooltip />} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-tracker contribution */}
      <div style={{ border: '2px solid #111', background: 'var(--surface)', padding: '20px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '14px' }}>
          Tracker weights
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {trackers.map(t => {
            const tData = buildOverallData([t], { [t.id]: logsByTracker[t.id] ?? [] }, today)
            const tScore = tData.length > 0 ? tData[tData.length - 1].score : 50
            const WEIGHT_LABELS = { 1: 'Nice to have', 2: 'Important', 3: 'Very important', 4: 'Insanely important' }
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {WEIGHT_LABELS[t.weight]}
                </div>
                <div style={{
                  fontSize: '13px', fontWeight: 500,
                  minWidth: '32px', textAlign: 'right',
                }}>
                  {tScore}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
