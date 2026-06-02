import { differenceInCalendarDays, parse, addDays, format, subDays } from 'date-fns'

const REF = new Date()
function pd(s) { return parse(s, 'yyyy-MM-dd', REF) }

function createdDate(tracker) {
  return format(new Date(tracker.created_at), 'yyyy-MM-dd')
}

// Delta for completing a window with a given log
function windowDelta(tracker, log) {
  if (tracker.type === 'scored') {
    if (log.value >= 88) return 1   // Great / Amazing → upward
    if (log.value >= 60) return 0   // Good / Okay → flat
    return -1                        // Poor → real dip
  }
  return 1 // binary / tag: +1 for any completed window
}

export function getDotColor(tracker, log) {
  if (tracker.type === 'tag') {
    const firstTag = log.tags?.[0]
    const def = (tracker.tags ?? []).find(t => t.label === firstTag)
    return def?.color ?? '#999'
  }
  if (tracker.type === 'scored') {
    if (log.value >= 97) return '#2d7a2d'
    if (log.value >= 88) return '#5a9e5a'
    if (log.value >= 75) return '#999999'
    if (log.value >= 60) return '#e67e22'
    return '#c0392b'
  }
  return '#999999'
}

function getDotLabel(tracker, log) {
  if (tracker.type === 'tag') return log.tags?.join(', ') ?? ''
  if (tracker.type === 'scored') {
    if (log.value >= 97) return 'Amazing'
    if (log.value >= 88) return 'Great'
    if (log.value >= 75) return 'Good'
    if (log.value >= 60) return 'Okay'
    return 'Poor'
  }
  return ''
}

// Build the ordered list of graph data points from tracker creation to today.
// Each point: { date, score, hasDot, dotColor, dotLabel, isToday }
// Only includes events (logs + missed-window dips) — recharts draws the line between them.
export function buildGraphData(tracker, logs, todayStr) {
  const created = createdDate(tracker)
  const freq = tracker.frequency_days
  const todayDayIdx = differenceInCalendarDays(pd(todayStr), pd(created))

  if (todayDayIdx < 0) return []

  const nonBonus = logs.filter(l => !l.is_bonus)
  const currentWinIdx = Math.floor(todayDayIdx / freq)

  const events = []
  let score = 0

  for (let w = 0; w <= currentWinIdx; w++) {
    const winStart = w * freq
    const winEnd = winStart + freq - 1
    const isCurrentWindow = w === currentWinIdx

    const winLogs = nonBonus
      .filter(l => {
        const d = differenceInCalendarDays(pd(l.date), pd(created))
        return d >= winStart && d <= winEnd
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    if (winLogs.length > 0) {
      const log = winLogs[0]
      score += windowDelta(tracker, log)
      events.push({
        date: log.date,
        score,
        hasDot: true,
        dotColor: getDotColor(tracker, log),
        dotLabel: getDotLabel(tracker, log),
        isToday: log.date === todayStr,
      })
    } else if (!isCurrentWindow) {
      // Missed window — record the dip at window-end date
      const missedDate = format(addDays(pd(created), winEnd), 'yyyy-MM-dd')
      if (missedDate <= todayStr) {
        score -= 1
        events.push({
          date: missedDate,
          score,
          hasDot: false,
          dotColor: null,
          dotLabel: 'Missed',
          isToday: false,
        })
      }
    }
    // Current window with no log yet: line stays flat, no event until they log
  }

  // Extend the line to today so it doesn't stop at the last log date
  const last = events[events.length - 1]
  if (last && last.date !== todayStr) {
    events.push({
      date: todayStr,
      score: last.score,
      hasDot: false,
      dotColor: null,
      dotLabel: null,
      isToday: true,
    })
  }

  // Bonus logs — appear as colored dots but don't move the line
  const bonusLogs = logs.filter(l => l.is_bonus)
  const bonusEvents = bonusLogs.map(log => {
    const upTo = events.filter(e => e.date <= log.date)
    const scoreAtTime = upTo.length > 0 ? upTo[upTo.length - 1].score : 0
    return {
      date: log.date,
      score: scoreAtTime,
      hasDot: true,
      dotColor: getDotColor(tracker, log),
      dotLabel: (getDotLabel(tracker, log) || 'Bonus') + ' · bonus',
      isToday: log.date === todayStr,
    }
  })

  return [...events, ...bonusEvents].sort((a, b) => a.date.localeCompare(b.date))
}

// For each tracker, normalize its cumulative score to [0, 100]:
//   all misses → 0, neutral → 50, all wins → 100
function normalizeScore(score, totalWindows) {
  const w = Math.max(1, totalWindows)
  return Math.max(0, Math.min(100, ((score + w) / (2 * w)) * 100))
}

// Build the weighted-average overall score series.
// Returns array of { date, score } from the earliest tracker to today.
export function buildOverallData(trackers, logsByTracker, todayStr) {
  if (!trackers.length) return []

  const series = trackers.map(t => ({
    tracker: t,
    created: format(new Date(t.created_at), 'yyyy-MM-dd'),
    events: buildGraphData(t, logsByTracker[t.id] ?? [], todayStr),
  }))

  // Compute on the union of all event dates plus today
  const dateSet = new Set([todayStr])
  series.forEach(({ events }) => events.forEach(e => dateSet.add(e.date)))
  const dates = [...dateSet].sort()

  return dates.map(date => {
    let weightedSum = 0
    let totalWeight = 0

    series.forEach(({ tracker, created, events }) => {
      if (date < created) return

      const upTo = events.filter(e => e.date <= date)
      const score = upTo.length > 0 ? upTo[upTo.length - 1].score : 0

      const dayIdx = differenceInCalendarDays(pd(date), pd(created))
      const totalWindows = Math.floor(dayIdx / tracker.frequency_days) + 1
      const normalized = normalizeScore(score, totalWindows)

      weightedSum += normalized * tracker.weight
      totalWeight += tracker.weight
    })

    if (totalWeight === 0) return null
    return { date, score: Math.round(weightedSum / totalWeight) }
  }).filter(Boolean)
}

// Derive the status label from the last 7 days of overall data
export function getOverallLabel(data) {
  if (data.length === 0) return 'needs attention'
  const current = data[data.length - 1].score
  const sevenDaysAgo = subDays(new Date(), 7)
  const sevenAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd')
  const past = data.filter(d => d.date <= sevenAgoStr)
  const baseline = past.length > 0 ? past[past.length - 1].score : current
  const delta = current - baseline
  if (delta > 3) return 'trending up'
  if (delta >= -3) return 'holding steady'
  return 'needs attention'
}
