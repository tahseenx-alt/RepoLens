// Groups fetched commits into days, weeks or months for the activity chart.
//
// Important: GitHub only sends the latest commits (up to COMMITS_LIMIT),
// so this describes the commits we fetched, not the repository's whole
// history. When the limit was reached, the chart starts at the oldest
// fetched commit instead of showing empty (unknown) periods as zero.

const DAY = 24 * 60 * 60 * 1000

export const PERIODS = [
  { id: 'fetched', label: 'All fetched', days: null },
  { id: '90d', label: '90 days', days: 90 },
  { id: '30d', label: '30 days', days: 30 },
]

// The date a commit landed on the branch. The author date can be much
// older (for example after a rebase), so the committer date is preferred.
export function commitDate(commit) {
  const value = commit?.commit?.committer?.date || commit?.commit?.author?.date
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

const dayLabel = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const monthLabel = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' })

// Builds empty buckets that cover start..end (inclusive).
function buildBuckets(start, end, unit) {
  const buckets = []
  let cursor = unit === 'month' ? startOfMonth(start) : startOfDay(start)
  while (cursor <= end) {
    const next =
      unit === 'day'
        ? addDays(cursor, 1)
        : unit === 'week'
          ? addDays(cursor, 7)
          : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    buckets.push({
      start: cursor.getTime(),
      end: next.getTime(),
      label: unit === 'month' ? monthLabel.format(cursor) : dayLabel.format(cursor),
      count: 0,
    })
    cursor = next
  }
  return buckets
}

function pickUnit(spanDays) {
  if (spanDays <= 45) return 'day'
  if (spanDays <= 366) return 'week'
  return 'month'
}

// Returns everything the activity chart needs:
//   buckets      - [{ start, end, label, count }]
//   unit         - 'day' | 'week' | 'month'
//   total        - commits inside the shown range
//   rangeStart / rangeEnd - Date objects for the shown range
//   limitReached - true when GitHub had more commits than we fetched
//   truncated    - true when the chosen period starts before the oldest
//                  fetched commit, so the start of the period is not shown
export function buildCommitActivity(commits, { periodDays = null, limit, now = new Date() } = {}) {
  const dates = (commits || []).map(commitDate).filter(Boolean)
  const limitReached = Boolean(limit) && (commits || []).length >= limit

  if (dates.length === 0) {
    return {
      buckets: [],
      unit: 'day',
      total: 0,
      rangeStart: null,
      rangeEnd: null,
      limitReached,
      truncated: false,
    }
  }

  const newest = new Date(Math.max(...dates.map(Number)))
  const oldest = new Date(Math.min(...dates.map(Number)))

  let rangeStart = periodDays ? startOfDay(new Date(now.getTime() - (periodDays - 1) * DAY)) : oldest
  const rangeEnd = periodDays ? now : newest

  // If we hit the limit, we know nothing about the time before the oldest
  // fetched commit. Start there instead of drawing made-up zeros.
  let truncated = false
  if (limitReached && rangeStart < oldest) {
    rangeStart = oldest
    truncated = Boolean(periodDays)
  }

  const spanDays = Math.max(1, Math.ceil((rangeEnd - startOfDay(rangeStart)) / DAY))
  const unit = pickUnit(spanDays)
  const buckets = buildBuckets(rangeStart, rangeEnd, unit)

  let total = 0
  for (const date of dates) {
    const time = date.getTime()
    if (time < buckets[0]?.start || time > rangeEnd.getTime()) {
      continue
    }
    const bucket = buckets.find((item) => time >= item.start && time < item.end)
    if (bucket) {
      bucket.count += 1
      total += 1
    }
  }

  return { buckets, unit, total, rangeStart, rangeEnd, limitReached, truncated }
}
