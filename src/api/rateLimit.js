// Keeps track of GitHub's rate limit, using the numbers GitHub sends back
// with every answer:
//   x-ratelimit-limit      requests allowed per hour (60 without a token)
//   x-ratelimit-remaining  requests left in the current hour
//   x-ratelimit-reset      when the hour restarts, in seconds since 1970
//   retry-after            seconds to wait after a "secondary" limit
// Docs: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
//
// The numbers are also saved in localStorage, so after a reload RepoLens
// still knows it has to wait instead of sending requests GitHub will refuse.

const STORAGE_KEY = 'repolens:rate-limit'
// GitHub asks clients to wait at least a minute after a secondary limit
// that doesn't say how long to wait.
export const DEFAULT_WAIT = 60 * 1000

// { limit, remaining, resetAt, blockedUntil, blockReason, seenAt, fromEarlierVisit }
// Times are milliseconds since 1970, or null when unknown.
let state = loadSaved()
const listeners = new Set()

function loadSaved() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
    if (!saved || typeof saved.seenAt !== 'number') {
      return null
    }
    const now = Date.now()
    // Once the hour has restarted, the saved numbers no longer say anything.
    const stillValid = (saved.resetAt && saved.resetAt > now) || (saved.blockedUntil && saved.blockedUntil > now)
    return stillValid ? { ...saved, fromEarlierVisit: true } : null
  } catch {
    return null
  }
}

function save() {
  try {
    if (state) {
      const { limit, remaining, resetAt, blockedUntil, blockReason, seenAt } = state
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ limit, remaining, resetAt, blockedUntil, blockReason, seenAt }),
      )
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage is blocked; the numbers are still known until the page closes.
  }
}

function update(next) {
  state = next
  save()
  const view = getRateLimit()
  listeners.forEach((listener) => listener(view))
}

// The latest numbers for the page, or null if GitHub hasn't answered yet:
// { limit, remaining, resetAt: Date, blockedUntil: Date, blockReason, seenAt: Date, fromEarlierVisit }
// `limit` and `remaining` are null when GitHub didn't send them.
export function getRateLimit() {
  if (!state) {
    return null
  }
  const toDate = (time) => (time ? new Date(time) : null)
  return {
    limit: state.limit,
    remaining: state.remaining,
    resetAt: toDate(state.resetAt),
    blockedUntil: toDate(state.blockedUntil),
    blockReason: state.blockReason ?? null,
    seenAt: new Date(state.seenAt),
    fromEarlierVisit: Boolean(state.fromEarlierVisit),
  }
}

export function onRateLimitChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Reads the rate-limit headers of one GitHub response.
export function recordRateLimit(response) {
  const remaining = Number(response.headers.get('x-ratelimit-remaining'))
  if (!response.headers.has('x-ratelimit-remaining') || !Number.isFinite(remaining)) {
    return
  }
  const limit = Number(response.headers.get('x-ratelimit-limit'))
  const reset = Number(response.headers.get('x-ratelimit-reset'))
  const stillBlocked = state?.blockedUntil > Date.now()
  update({
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    remaining,
    resetAt: Number.isFinite(reset) && reset > 0 ? reset * 1000 : null,
    blockedUntil: stillBlocked ? state.blockedUntil : null,
    blockReason: stillBlocked ? state.blockReason : null,
    seenAt: Date.now(),
    fromEarlierVisit: false,
  })
}

// Stops new requests for a while. `reason` is 'secondary' when GitHub
// said too many requests arrived at once, otherwise 'wait'.
export function pauseRequests(milliseconds, reason) {
  const now = Date.now()
  update({
    limit: state?.limit ?? null,
    remaining: state?.remaining ?? null,
    resetAt: state?.resetAt ?? null,
    blockedUntil: now + milliseconds,
    blockReason: reason,
    seenAt: now,
    fromEarlierVisit: false,
  })
}

// When GitHub has said "no more requests for now", returns
// { until: Date, reason: 'hourly' | 'secondary' | 'wait' }. Otherwise null.
export function currentBlock(now = Date.now()) {
  if (!state) {
    return null
  }
  if (state.blockedUntil && state.blockedUntil > now) {
    return { until: new Date(state.blockedUntil), reason: state.blockReason || 'wait' }
  }
  if (state.remaining === 0 && state.resetAt && state.resetAt > now) {
    return { until: new Date(state.resetAt), reason: 'hourly' }
  }
  return null
}

// Used by tests: forget everything.
export function resetRateLimit() {
  update(null)
}

// Used by tests: act as if the page was reloaded.
export function reloadRateLimit() {
  state = loadSaved()
}
