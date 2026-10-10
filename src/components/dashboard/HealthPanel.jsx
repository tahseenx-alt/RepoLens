import { countByStatus } from '../../utils/healthChecks.js'
import { HEALTH_STATUS } from './healthStatus.js'
import Panel from '../ui/Panel.jsx'

// The full list of health checks. `checks` comes from runHealthChecks(),
// which RepoDashboard runs once so the overview and this tab agree.
function HealthPanel({ checks }) {
  const counts = countByStatus(checks)

  return (
    <Panel
      id="health"
      title="Health checks"
      description="Simple rules based on real repository data."
      footer={
        <p className="note">
          These checks look for common project files and metadata. They don&apos;t measure code
          quality or security. &ldquo;Unavailable&rdquo; means GitHub didn&apos;t answer, not that
          something is missing.
        </p>
      }
    >
      <p className="health-summary" aria-live="polite">
        <span className="state-passed">{counts.passed} passed</span>
        <span className="state-warning">
          {counts.warning} {counts.warning === 1 ? 'warning' : 'warnings'}
        </span>
        {counts.unavailable > 0 && <span className="state-unavailable">{counts.unavailable} unavailable</span>}
        {counts.pending > 0 && <span className="muted">{counts.pending} checking</span>}
      </p>

      <ul className="health-list">
        {checks.map((check) => {
          const { Icon, label } = HEALTH_STATUS[check.status]
          return (
            <li key={check.id} className={`health-item state-${check.status}`}>
              <Icon
                size={16}
                className={`health-icon ${check.status === 'pending' ? 'spin' : ''}`}
                aria-hidden="true"
              />
              <div>
                <p className="health-title">
                  {check.title}
                  <span className="health-status">{label}</span>
                </p>
                <p className="health-text">{check.summary}</p>
                {check.suggestion && <p className="health-suggestion">{check.suggestion}</p>}
                <p className="health-source">Source: {check.source}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export default HealthPanel
