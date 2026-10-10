import { AlertIcon } from './Icons.jsx'

// A dashboard card that shows a spinner while its data loads,
// a friendly message if loading fails, and the content once it's ready.
// `children` is a function that receives the loaded data.
function AnalyticsCard({ title, subtitle, Icon, state, className = '', children }) {
  return (
    <article className={`analytics-card ${className}`}>
      <header className="analytics-card-header">
        <span className="analytics-card-icon">
          <Icon size={18} />
        </span>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>

      {state.status === 'loading' && (
        <div className="analytics-loading" role="status">
          <span className="spinner spinner-large" aria-hidden="true" />
          Loading {title.toLowerCase()}…
        </div>
      )}

      {state.status === 'error' && (
        <div className="error-message error-message-small" role="alert">
          <AlertIcon size={18} />
          <p>{state.error}</p>
        </div>
      )}

      {state.status === 'success' && children(state.data)}
    </article>
  )
}

export default AnalyticsCard
