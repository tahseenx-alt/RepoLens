import { CircleSlash, RefreshCw, TriangleAlert } from 'lucide-react'

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
  return (
    <div className="state-error" role="alert">
      <TriangleAlert size={16} aria-hidden="true" />
      <div>
        <p className="state-title">{isRateLimit ? 'GitHub rate limit reached' : title}</p>
        <p className="state-text">{error?.message || 'Something went wrong. Please try again.'}</p>
        {onRetry && (
          <button type="button" className="button button-small" onClick={onRetry}>
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ children }) {
  return (
    <div className="state-empty">
      <CircleSlash size={16} aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

// Shows the right state for a { status, data, error, retry } object
// from useGitHubData. `children` is a function that receives the data.
export function AsyncContent({ state, loadingLabel, lines, children }) {
  if (state.status === 'loading') {
    return <LoadingState label={loadingLabel} lines={lines} />
  }
  if (state.status === 'error') {
    return <ErrorState error={state.error} onRetry={state.retry} />
  }
  return children(state.data)
}
