import { useRateLimit } from '../../hooks/useRateLimit.js'

// Shows how many GitHub API requests are left, using the numbers GitHub
// sends back with every response. Hidden until the first request.
function RateLimitNote() {
  const rateLimit = useRateLimit()
  if (!rateLimit) {
    return null
  }
  const reset = rateLimit.resetAt
    ? rateLimit.resetAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null
  return (
    <p className="footer-rate">
      GitHub API: {rateLimit.remaining}
      {rateLimit.limit ? ` of ${rateLimit.limit}` : ''} requests left this hour
      {reset ? `, resets at ${reset}` : ''}
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
