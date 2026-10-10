import { ArrowRight } from 'lucide-react'
import { formatNumber, safeExternalUrl } from '../../utils/format.js'
import CommitActivityPanel from './CommitActivityPanel.jsx'
import LanguagesPanel from './LanguagesPanel.jsx'
import CommitRow from './CommitRow.jsx'
import { HEALTH_STATUS } from './healthStatus.js'
import Panel from '../ui/Panel.jsx'
import { AsyncContent, EmptyState } from '../ui/States.jsx'

const PREVIEW_COUNT = 5

function ViewAllButton({ label, onClick }) {
  return (
    <button type="button" className="text-button view-all" onClick={onClick}>
      {label}
      <ArrowRight size={13} aria-hidden="true" />
    </button>
  )
}

function LatestCommits({ state, onViewAll }) {
  return (
    <Panel
      id="overview-commits"
      title="Latest commits"
      actions={<ViewAllButton label="All commits" onClick={onViewAll} />}
    >
      <AsyncContent state={state} loadingLabel="Loading commits…" lines={5}>
        {(commits) =>
          commits.length === 0 ? (
            <EmptyState>This repository has no commits yet.</EmptyState>
          ) : (
            <ol className="commit-list compact">
              {commits.slice(0, PREVIEW_COUNT).map((item) => (
                <CommitRow key={item.sha} item={item} />
              ))}
            </ol>
          )
        }
      </AsyncContent>
    </Panel>
  )
}

function TopContributors({ state, onViewAll }) {
  return (
    <Panel
      id="overview-contributors"
      title="Top contributors"
      actions={<ViewAllButton label="All contributors" onClick={onViewAll} />}
    >
      <AsyncContent state={state} loadingLabel="Loading contributors…" lines={5}>
        {(contributors) =>
          contributors.length === 0 ? (
            <EmptyState>GitHub returned no contributors.</EmptyState>
          ) : (
            <ol className="mini-list">
              {contributors.slice(0, PREVIEW_COUNT).map((person, index) => {
                const url = person.login ? safeExternalUrl(person.html_url) : null
                const name = person.login || person.name || 'Unknown'
                return (
                  <li key={person.id ?? `${name}-${index}`}>
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" width="20" height="20" loading="lazy" />
                    ) : (
                      <span className="avatar-placeholder" aria-hidden="true" />
                    )}
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        {name}
                      </a>
                    ) : (
                      <span>{name}</span>
                    )}
                    <span className="mini-value mono">
                      {formatNumber(person.contributions)}
                      <span className="sr-only"> commits</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          )
        }
      </AsyncContent>
    </Panel>
  )
}

function HealthSummary({ checks, onViewAll }) {
  return (
    <Panel
      id="overview-health"
      title="Health checks"
      actions={<ViewAllButton label="Details" onClick={onViewAll} />}
    >
      <ul className="health-mini-list">
        {checks.map((check) => {
          const { Icon, label } = HEALTH_STATUS[check.status]
          return (
            <li key={check.id} className={`state-${check.status}`}>
              <Icon
                size={15}
                className={`health-icon ${check.status === 'pending' ? 'spin' : ''}`}
                aria-hidden="true"
              />
              <span className="health-mini-title">{check.title}</span>
              <span className="health-status">{label}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

// The first tab: the most useful information from every section,
// arranged to fit on one screen. "View all" buttons open the full tabs.
function OverviewTab({ repo, commits, languages, contributors, checks, onSelectTab }) {
  return (
    <div className="overview-grid">
      <CommitActivityPanel state={commits} repo={repo} />
      <LanguagesPanel state={languages} />
      <LatestCommits state={commits} onViewAll={() => onSelectTab('commits')} />
      <TopContributors state={contributors} onViewAll={() => onSelectTab('contributors')} />
      <HealthSummary checks={checks} onViewAll={() => onSelectTab('health')} />
    </div>
  )
}

export default OverviewTab
