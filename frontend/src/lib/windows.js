import { differenceInCalendarDays, parse, format } from 'date-fns'

// Parse a 'yyyy-MM-dd' string as LOCAL midnight (not UTC).
// parseISO() treats date-only strings as UTC, causing off-by-hours errors.
const REF = new Date()
function pd(s) { return parse(s, 'yyyy-MM-dd', REF) }

function dayIdx(dateStr, createdStr) {
  return differenceInCalendarDays(pd(dateStr), pd(createdStr))
}

// Supabase returns created_at as a UTC timestamp. Convert to local date so
// window boundaries align with the user's clock, not UTC.
function createdDate(tracker) {
  return format(new Date(tracker.created_at), 'yyyy-MM-dd')
}

// Returns the window boundaries (as day-indices from creation) for a given date
function windowFor(tracker, dateStr) {
  const created = createdDate(tracker)
  const d = dayIdx(dateStr, created)
  const freq = tracker.frequency_days
  const winIdx = Math.floor(Math.max(0, d) / freq)
  return {
    winIdx,
    start: winIdx * freq,
    end: winIdx * freq + freq - 1,
  }
}

// Returns: 'done' | 'ahead' | 'available' | 'due_tomorrow' | 'pending'
export function getWindowState(tracker, logs, todayStr) {
  const created = createdDate(tracker)
  const todayDayIdx = dayIdx(todayStr, created)
  if (todayDayIdx < 0) return 'pending'

  const { winIdx, start, end } = windowFor(tracker, todayStr)
  const nonBonus = logs.filter(l => !l.is_bonus)

  // Logs that fall in the current window
  const inCurrent = nonBonus.filter(l => {
    const d = dayIdx(l.date, created)
    return d >= start && d <= end
  })

  if (inCurrent.length > 0) {
    const loggedOnDay = dayIdx(inCurrent[0].date, created)
    // 'done' if logged today, 'ahead' if logged earlier this window
    return loggedOnDay === todayDayIdx ? 'done' : 'ahead'
  }

  // No log this window — check previous window
  if (winIdx === 0) return 'pending' // first window, no prior to compare

  const prevStart = start - tracker.frequency_days
  const prevEnd = start - 1
  const inPrev = nonBonus.filter(l => {
    const d = dayIdx(l.date, created)
    return d >= prevStart && d <= prevEnd
  })

  if (inPrev.length > 0) {
    // Completed last window — check for due-tomorrow nudge
    if (tracker.due_tomorrow_nudge && todayDayIdx === end - 1) return 'due_tomorrow'
    return 'available'
  }

  return 'pending'
}

// True if adding a log today would be a bonus (window already satisfied)
export function isBonus(tracker, logs, todayStr) {
  const created = createdDate(tracker)
  const { start, end } = windowFor(tracker, todayStr)
  return logs.some(l => {
    if (l.is_bonus) return false
    const d = dayIdx(l.date, created)
    return d >= start && d <= end
  })
}

// True if the repeat-nudge should show given the tags the user is about to select
export function shouldNudge(tracker, logs, todayStr, selectedTags) {
  if (!tracker.flag_repeats || tracker.type !== 'tag') return false

  const created = createdDate(tracker)
  const todayDayIdx = dayIdx(todayStr, created)

  // Find the most recent non-bonus log before today
  const prev = logs
    .filter(l => !l.is_bonus && dayIdx(l.date, created) < todayDayIdx)
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  if (!prev || !prev.tags?.length) return false

  const flagTag = tracker.flag_repeat_tag
  if (flagTag) {
    return prev.tags.includes(flagTag) && selectedTags.includes(flagTag)
  }
  return selectedTags.some(t => prev.tags.includes(t))
}
