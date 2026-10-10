import { useRateLimit } from '../../hooks/useRateLimit.js'
import { formatClock } from '../../utils/format.js'

// Shows how many GitHub API requests are left, using the numbers GitHub
// sends back with every response. Hidden until the first request, and
// again once the hour has restarted (the old numbers would be wrong).
function RateLimitNote() {
  const rateLimit = useRateLimit()
  if (!rateLimit) {
    return null
  }
  const { limit, remaining, resetAt, blockedUntil, blockReason, seenAt, fromEarlierVisit } = rateLimit

  let text
  if (blockedUntil) {
    text =
      `GitHub API: paused until ${formatClock(blockedUntil)}` +
      (blockReason === 'secondary' ? ' after too many requests at once' : '')
  } else if (remaining === 0) {
    text = `GitHub API: no requests left${resetAt ? ` until ${formatClock(resetAt)}` : ''}`
  } else if (Number.isFinite(remaining)) {
    text =
      `GitHub API: ${remaining}${limit ? ` of ${limit}` : ''} requests left this hour` +
      (resetAt ? `, resets at ${formatClock(resetAt)}` : '')
  } else {
    return null
  }
  // Numbers saved during an earlier visit may have changed since.
  const asOf = fromEarlierVisit ? ` (as of ${formatClock(seenAt)})` : ''
  const limited = Boolean(blockedUntil) || remaining === 0

  return (
    <p className={`footer-rate${limited ? ' footer-rate-limited' : ''}`}>
      {text}
      {asOf}
    </p>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <p>
          Built by{' '}
          <a href="https://github.com/tahseenx-alt" target="_blank" rel="noreferrer">
            Tahseen Anwer
          </a>
          . Data from the public GitHub REST API.
        </p>
        <RateLimitNote />
      </div>
    </footer>
  )
}

export default SiteFooter
