import {
  Archive,
  Calendar,
  CircleDot,
  Clock,
  Code,
  ExternalLink,
  Eye,
  GitBranch,
  GitFork,
  Globe,
  RefreshCw,
  Scale,
  Star,
} from 'lucide-react'
import { formatCompact, formatDate, formatNumber, isCount, safeExternalUrl } from '../../utils/format.js'

// The four headline numbers and the exact API field each one comes from.
// Watchers are people subscribed to notifications (`subscribers_count`).
// GitHub's `watchers_count` is just another copy of the star count,
// so it is deliberately not used.
const METRICS = [
  { label: 'Stars', field: 'stargazers_count', Icon: Star },
  { label: 'Forks', field: 'forks_count', Icon: GitFork },
  {
    label: 'Open issues & PRs',
    field: 'open_issues_count',
    Icon: CircleDot,
    hint: 'GitHub counts open issues and open pull requests together.',
  },
  {
    label: 'Watchers',
    field: 'subscribers_count',
    Icon: Eye,
    hint: 'People who get notifications for this repository. Not the same as stars.',
  },
]

function licenseText(license) {
  if (!license) {
    return 'None detected'
  }
  if (license.spdx_id && license.spdx_id !== 'NOASSERTION') {
    return license.spdx_id
  }
  return license.name || 'Unrecognized license'
}

function Metric({ repo, label, field, Icon, hint }) {
  const value = repo[field]
  const available = isCount(value)
  const title = available
    ? `${formatNumber(value)} (${field})${hint ? `. ${hint}` : ''}`
    : `GitHub didn't return a valid ${field} value.`
  return (
    <div className="metric" title={title}>
      <dt>
        <Icon size={14} aria-hidden="true" />
        {label}
      </dt>
      <dd className={available ? undefined : 'metric-unavailable'}>
        {/* The short form is for sighted users; screen readers get the exact number. */}
        <span aria-hidden="true">{formatCompact(value)}</span>
        <span className="sr-only">{available ? formatNumber(value) : 'Unavailable'}</span>
      </dd>
    </div>
  )
}

// The top of the dashboard: name, description, links, key numbers
// and repository details. Missing values are shown as missing, never guessed.
function RepoHeader({ repo, fetchedAt, onRefresh }) {
  const homepage = safeExternalUrl(repo.homepage)
  const repoUrl = safeExternalUrl(repo.html_url) || `https://github.com/${repo.full_name}`

  const details = [
    { label: 'Language', value: repo.language || 'Not detected', Icon: Code },
    { label: 'Branch', value: repo.default_branch || 'Unknown', Icon: GitBranch, mono: true },
    { label: 'License', value: licenseText(repo.license), Icon: Scale },
    { label: 'Created', value: formatDate(repo.created_at), Icon: Calendar },
    { label: 'Last push', value: formatDate(repo.pushed_at), Icon: Clock },
  ]

  return (
    <section className="repo-header" aria-labelledby="repo-title">
      <div className="repo-header-top">
        <div className="repo-identity">
          {repo.owner?.avatar_url && (
            <img className="repo-avatar" src={repo.owner.avatar_url} alt="" width="36" height="36" />
          )}
          <div className="repo-identity-text">
            <h1 id="repo-title">
              <span className="repo-owner">{repo.owner.login}</span>
              <span className="repo-slash" aria-hidden="true">
                /
              </span>
              <span className="sr-only"> / </span>
              <span className="repo-name">{repo.name}</span>
            </h1>
            <div className="repo-tags">
              <span className="tag">{repo.visibility === 'public' ? 'Public' : repo.visibility || 'Public'}</span>
              {repo.fork && <span className="tag">Fork</span>}
              {repo.archived && (
                <span className="tag tag-warning">
                  <Archive size={12} aria-hidden="true" />
                  Archived
                </span>
              )}
              {repo.topics?.slice(0, 4).map((topic) => (
                <span key={topic} className="tag tag-topic">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="repo-actions">
          {fetchedAt && (
            <span className="fetched-at">
              Updated{' '}
              <time dateTime={fetchedAt.toISOString()}>
                {fetchedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </time>
            </span>
          )}
          <button type="button" className="button" onClick={onRefresh}>
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </button>
          <a className="button" href={repoUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} aria-hidden="true" />
            GitHub
            <span className="sr-only">(opens {repo.full_name} in a new tab)</span>
          </a>
        </div>
      </div>

      <p
        className={`repo-description ${repo.description ? '' : 'muted'}`}
        title={repo.description || undefined}
      >
        {repo.description || 'No description provided.'}
        {homepage && (
          <>
            {' '}
            <a href={homepage} target="_blank" rel="noreferrer" className="repo-homepage">
              <Globe size={13} aria-hidden="true" />
              {homepage.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          </>
        )}
      </p>

      <div className="summary-strip">
        <dl className="metric-group">
          {METRICS.map((metric) => (
            <Metric key={metric.field} repo={repo} {...metric} />
          ))}
        </dl>
        <dl className="detail-list">
          {details.map(({ label, value, Icon, mono }) => (
            <div key={label}>
              <dt>
                <Icon size={13} aria-hidden="true" />
                {label}
              </dt>
              <dd className={mono ? 'mono' : undefined}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export default RepoHeader
