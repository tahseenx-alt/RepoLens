import {
  Archive,
  Calendar,
  Clock,
  Code,
  ExternalLink,
  Eye,
  GitBranch,
  GitFork,
  Globe,
  CircleDot,
  RefreshCw,
  Scale,
  Star,
} from 'lucide-react'
import { formatCompact, formatDate, formatNumber, safeExternalUrl } from '../../utils/format.js'

// The top of the dashboard: name, description, links, key numbers
// and repository details. Missing values are shown as missing, never guessed.
function RepoHeader({ repo, onRefresh }) {
  const homepage = safeExternalUrl(repo.homepage)
  const repoUrl = safeExternalUrl(repo.html_url) || `https://github.com/${repo.full_name}`

  const metrics = [
    { label: 'Stars', value: repo.stargazers_count, Icon: Star },
    { label: 'Forks', value: repo.forks_count, Icon: GitFork },
    {
      label: 'Open issues + PRs',
      value: repo.open_issues_count,
      Icon: CircleDot,
      hint: 'GitHub counts open pull requests in this number.',
    },
    { label: 'Watchers', value: repo.subscribers_count, Icon: Eye },
  ]

  const details = [
    { label: 'Primary language', value: repo.language || 'Not detected', Icon: Code },
    { label: 'Default branch', value: repo.default_branch || 'Unknown', Icon: GitBranch, mono: true },
    {
      label: 'License',
      value: repo.license
        ? repo.license.spdx_id && repo.license.spdx_id !== 'NOASSERTION'
          ? repo.license.spdx_id
          : repo.license.name
        : 'None detected',
      Icon: Scale,
    },
    { label: 'Created', value: formatDate(repo.created_at), Icon: Calendar },
    { label: 'Last push', value: formatDate(repo.pushed_at), Icon: Clock },
  ]

  return (
    <section className="repo-header" aria-labelledby="repo-title">
      <div className="repo-header-top">
        <div className="repo-identity">
          {repo.owner?.avatar_url && (
            <img
              className="repo-avatar"
              src={repo.owner.avatar_url}
              alt=""
              width="40"
              height="40"
            />
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
            </div>
          </div>
        </div>

        <div className="repo-actions">
          <button type="button" className="button" onClick={onRefresh}>
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </button>
          <a className="button" href={repoUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} aria-hidden="true" />
            View on GitHub
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>

      <p className={`repo-description ${repo.description ? '' : 'muted'}`}>
        {repo.description || 'No description provided.'}
      </p>

      {(homepage || repo.topics?.length > 0) && (
        <div className="repo-links">
          {homepage && (
            <a href={homepage} target="_blank" rel="noreferrer" className="repo-homepage">
              <Globe size={14} aria-hidden="true" />
              {homepage.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
          {repo.topics?.length > 0 && (
            <ul className="topic-list" aria-label="Topics">
              {repo.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <dl className="metric-strip">
        {metrics.map(({ label, value, Icon, hint }) => (
          <div key={label} className="metric" title={hint}>
            <dt>
              <Icon size={14} aria-hidden="true" />
              {label}
            </dt>
            <dd>
              <span aria-hidden="true">{formatCompact(value)}</span>
              <span className="sr-only">{formatNumber(value)}</span>
            </dd>
          </div>
        ))}
      </dl>

      <dl className="detail-list">
        {details.map(({ label, value, Icon, mono }) => (
          <div key={label}>
            <dt>
              <Icon size={14} aria-hidden="true" />
              {label}
            </dt>
            <dd className={mono ? 'mono' : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default RepoHeader
