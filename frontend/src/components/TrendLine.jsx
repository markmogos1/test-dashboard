import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { parse, differenceInCalendarDays } from 'date-fns'
import { buildGraphData } from '../lib/scoring'

const REF = new Date()
function pd(s) { return parse(s, 'yyyy-MM-dd', REF) }

function fmtDate(dateStr, todayStr) {
  if (dateStr === todayStr) return 'Today'
  const daysAgo = differenceInCalendarDays(pd(todayStr), pd(dateStr))
  if (daysAgo === 1) return 'Yesterday'
  return `${daysAgo} days ago`
}

function CustomDot(props) {
  const { cx, cy, payload } = props
  if (!cx || !cy || !payload) return null
  if (payload.isToday) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="var(--accent)" className="today-ring" />
        <circle cx={cx} cy={cy} r={6} fill="var(--accent)" stroke="#111" strokeWidth={2} className="today-dot" />
      </g>
    )
  }
  if (!payload.hasDot) return null
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill={payload.dotColor ?? '#999'}
      stroke="#111" strokeWidth={1.5}
    />
  )
}

export default function TrendLine({ tracker, logs, today }) {
  const data = useMemo(
    () => buildGraphData(tracker, logs, today),
    [tracker, logs, today],
  )

  // Tooltip defined inside component so it closes over `today`
  function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d || (!d.hasDot && !d.isToday)) return null
    const dateLabel = fmtDate(d.date, today)
    const text = d.dotLabel ? `${dateLabel} · ${d.dotLabel}` : dateLabel
    return (
      <div style={{
        background: '#fff', border: '2px solid #111',
        padding: '5px 10px', fontSize: '12px', fontWeight: 500,
        pointerEvents: 'none',
      }}>
        {text}
      </div>
    )
  }

  const CHART_H = 72
  // Always render a fixed-height legend row so all cards stay the same height.
  const legendRow = (
    <div style={{ height: '20px', display: 'flex', alignItems: 'center', marginTop: '4px', overflow: 'hidden' }}>
      {tracker.type === 'tag' && (tracker.tags ?? []).length > 0 && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {tracker.tags.map(tag => (
            <span key={tag.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  if (data.length === 0) {
    return (
      <div>
        <svg width="100%" height={CHART_H} style={{ display: 'block' }}>
          <line
            x1="6" y1={CHART_H * 0.62} x2="97%" y2={CHART_H * 0.62}
            stroke="#ddd" strokeWidth={1.5} strokeDasharray="4 6"
          />
        </svg>
        {legendRow}
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={CHART_H}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 4, left: 6 }}>
          <Line
            type="monotone"
            dataKey="score"
            stroke="#111"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={false}
            isAnimationActive={false}
          />
          <Tooltip content={<CustomTooltip />} />
        </LineChart>
      </ResponsiveContainer>
      {legendRow}
    </div>
  )
}
