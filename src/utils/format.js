// Small helpers that turn API values into text for the page.
// Every helper returns a readable fallback instead of inventing data.

const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const fullNumber = new Intl.NumberFormat('en')

const dateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})
const shortDateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

// True only for a real count from the API: a whole number, 0 or more.
// Missing values (undefined, null) and odd values ("12", -1, NaN) are not counts.
export function isCount(value) {
  return Number.isInteger(value) && value >= 0
}

// 228934 -> "228.9K". Anything that isn't a real count becomes "Unavailable",
// so a missing value is never shown as a made-up 0.
export function formatCompact(value) {
  return isCount(value) ? compactNumber.format(value) : 'Unavailable'
}

// 228934 -> "228,934".
export function formatNumber(value) {
  return Number.isFinite(value) ? fullNumber.format(value) : '—'
}

function toDate(value) {
  if (!value) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// "2024-03-05T10:00:00Z" -> "Mar 5, 2024".
export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFormat.format(date) : 'Unknown date'
}

// "2024-03-05T10:00:00Z" -> "Mar 5".
export function formatShortDate(value) {
  const date = toDate(value)
  return date ? shortDateFormat.format(date) : '—'
}

// "3 days ago", "2 months ago". `now` can be passed in for tests.
export function formatRelative(value, now = Date.now()) {
  const date = toDate(value)
  if (!date) {
    return 'Unknown date'
  }
  const seconds = Math.round((now - date.getTime()) / 1000)
  if (seconds < 60) {
    return 'just now'
  }
  const steps = [
    ['minute', 60],
    ['hour', 60],
    ['day', 24],
    ['month', 30],
    ['year', 12],
  ]
  let amount = seconds / 60
  let unit = 'minute'
  for (let i = 1; i < steps.length && amount >= steps[i][1]; i++) {
    amount /= steps[i][1]
    unit = steps[i][0]
  }
  const rounded = Math.floor(amount)
  return `${rounded} ${unit}${rounded === 1 ? '' : 's'} ago`
}

// 45210 -> "44.2 KB".
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '—'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`
}

export function formatPercent(percent) {
  if (!Number.isFinite(percent)) {
    return '—'
  }
  return percent > 0 && percent < 0.1 ? '<0.1%' : `${percent.toFixed(1)}%`
}

export function pluralize(count, word, plural = `${word}s`) {
  return `${formatNumber(count)} ${count === 1 ? word : plural}`
}

// Only allow normal web links from API data, so a value like
// "javascript:..." can never end up in an href.
export function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

// The first line of a commit message is its title.
export function commitTitle(message) {
  return (message || '').split('\n')[0].trim() || '(no commit message)'
}
