import { CircleSlash, RefreshCw, TriangleAlert } from 'lucide-react'
import { useTimeReached } from '../../hooks/useTimeReached.js'
import { formatClock } from '../../utils/format.js'

// Shared loading, error and empty states, so every section behaves the same.

export function LoadingState({ label = 'Loading…', lines = 3 }) {
  return (
    <div className="state-loading" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="skeleton-line" aria-hidden="true" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = "Couldn't load this section" }) {
  const isRateLimit = error?.type === 'rate-limit'
  // After a rate limit, trying again before GitHub resets can't work,
  // so the button waits until then.
  const retryAt = isRateLimit ? error.retryAt : null
  const canRetry = useTimeReached(retryAt)
  return (
    <div className="state-error fade-in" role="alert">
      <TriangleAlert size={16} aria-hidden="true" />
      <div>
        <p className="state-title">{isRateLimit ? 'GitHub rate limit reached' : title}</p>
        <p className="state-text">{error?.message || 'Something went wrong. Please try again.'}</p>
        {onRetry && (
          <button type="button" className="button button-small" onClick={onRetry} disabled={!canRetry}>
            <RefreshCw size={14} aria-hidden="true" />
            {canRetry ? 'Try again' : `Try again after ${formatClock(retryAt)}`}
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ children }) {
  return (
    <div className="state-empty fade-in">
      <CircleSlash size={16} aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

// Shows the right state for a { status, data, error, retry } object
// from useGitHubData. `children` is a function that receives the data.
export function AsyncContent({ state, loadingLabel, lines, children }) {
  if (state.status === 'loading' || state.status === 'idle') {
    return <LoadingState label={loadingLabel} lines={lines} />
  }
  if (state.status === 'error') {
    return <ErrorState error={state.error} onRetry={state.retry} />
  }
  // The content fades in as it replaces the loading placeholder.
  return <div className="fade-in">{children(state.data)}</div>
}

// A placeholder shaped like the dashboard, shown while the repository loads,
// so the page doesn't jump when the real content appears.
export function DashboardSkeleton({ label }) {
  return (
    <div className="dashboard-skeleton" role="status">
      <span className="sr-only">{label}</span>
      <div className="skeleton-row" aria-hidden="true">
        <span className="skeleton-block skeleton-avatar" />
        <span className="skeleton-line" style={{ width: '30%' }} />
      </div>
      <span className="skeleton-line" style={{ width: '55%' }} aria-hidden="true" />
      <span className="skeleton-block skeleton-strip" aria-hidden="true" />
      <span className="skeleton-line" style={{ width: '40%' }} aria-hidden="true" />
      <div className="skeleton-grid" aria-hidden="true">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
    </div>
  )
}
