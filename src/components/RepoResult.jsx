import {
  CalendarIcon,
  CodeIcon,
  ExternalLinkIcon,
  ForkIcon,
  IssueIcon,
  StarIcon,
} from './Icons.jsx'

// Shows big numbers in a short way, e.g. 228934 -> "228.9K".
const numberFormat = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const dateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function RepoResult({ repo }) {
  const stats = [
    { label: 'Stars', value: numberFormat.format(repo.stargazers_count), Icon: StarIcon },
    { label: 'Forks', value: numberFormat.format(repo.forks_count), Icon: ForkIcon },
    {
      label: 'Open issues',
      value: numberFormat.format(repo.open_issues_count),
      Icon: IssueIcon,
    },
    { label: 'Language', value: repo.language || 'Not specified', Icon: CodeIcon },
    {
      label: 'Last updated',
      value: dateFormat.format(new Date(repo.updated_at)),
      Icon: CalendarIcon,
    },
  ]

  return (
    <article className="repo-card">
      <div className="repo-header">
        <img
          className="repo-avatar"
          src={repo.owner.avatar_url}
          alt=""
          width="48"
          height="48"
        />
        <div className="repo-title">
          <h2>
            <span className="repo-owner">{repo.owner.login} /</span> {repo.name}
          </h2>
          <p>{repo.description || 'No description provided.'}</p>
        </div>
        <a
          href={repo.html_url}
          className="repo-link"
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${repo.full_name} on GitHub`}
        >
          <ExternalLinkIcon size={18} />
        </a>
      </div>

      <dl className="repo-stats">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="repo-stat">
            <dt>
              <Icon size={16} />
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

export default RepoResult
